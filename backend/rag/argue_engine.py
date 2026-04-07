import os
import json
import re
import asyncio
from typing import Any, Dict

from groq import AsyncGroq

# Optional: load .env if you use one
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass


GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

client = AsyncGroq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

PLAINTIFF_SYSTEM = """You are an experienced plaintiff's attorney. Your job is to present the
strongest possible arguments in favor of the plaintiff based on the case facts provided.
Structure your response with:
1. Opening Position (2-3 sentences)
2. Key Arguments (3-4 bullet points, each with a brief legal basis)
3. Strongest Evidence/Points
4. Expected Outcome if arguments succeed

Be persuasive, cite relevant legal principles, and remain professional.
Respond in JSON format:
{
  "opening": "...",
  "arguments": ["..."],
  "evidence": ["..."],
  "outcome": "..."
}"""

DEFENDANT_SYSTEM = """You are an experienced defense attorney. Your job is to present the
strongest possible arguments in favor of the defendant based on the case facts provided.
Structure your response with:
1. Opening Position (2-3 sentences)
2. Key Arguments (3-4 bullet points, each with a legal basis)
3. Counter-Evidence / Weaknesses in Plaintiff's Case
4. Expected Outcome if arguments succeed

Be persuasive, cite relevant legal principles, and remain professional.
Respond in JSON format:
{
  "opening": "...",
  "arguments": ["..."],
  "evidence": ["..."],
  "outcome": "..."
}"""

JUDGE_SYSTEM = """You are an impartial judge reviewing a legal case. Analyze both sides objectively.
Structure your response with:
1. Case Summary (neutral framing)
2. Plaintiff's Strongest Points (2-3 points)
3. Defendant's Strongest Points (2-3 points)
4. Key Legal Questions to be Decided
5. Likely Ruling with Reasoning

Be balanced, cite relevant law/precedent where applicable, and focus on legal merit.
Respond in JSON format:
{
  "summary": "...",
  "plaintiff_points": ["..."],
  "defendant_points": ["..."],
  "legal_questions": ["..."],
  "ruling": "..."
}"""


def _extract_json(text: str) -> Dict[str, Any]:
    """
    Robustly extract JSON from model output.
    Handles plain JSON and ```json fenced blocks.
    """
    text = text.strip()

    # Remove markdown fences if present
    if text.startswith("```"):
        parts = text.split("```")
        if len(parts) >= 2:
            text = parts[1].strip()
            if text.startswith("json"):
                text = text[4:].strip()

    # Try direct parse first
    try:
        return json.loads(text)
    except Exception:
        pass

    # Fallback: extract first JSON object/array from text
    match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
    if match:
        return json.loads(match.group(1))

    raise ValueError(f"Could not parse JSON from model output: {text[:300]}")


async def generate_argument(case_text: str, role: str) -> dict:
    """
    Generate argument for a specific role: plaintiff / defendant / judge
    """
    if client is None:
        return {
            "error": "GROQ_API_KEY is not set. Please add it to your environment or .env file.",
            "role": role,
        }

    system_map = {
        "plaintiff": PLAINTIFF_SYSTEM,
        "defendant": DEFENDANT_SYSTEM,
        "judge": JUDGE_SYSTEM,
    }
    system_prompt = system_map.get(role, JUDGE_SYSTEM)

    try:
        response = await client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": (
                        f"Here is the case to analyze:\n\n{case_text}\n\n"
                        f"Provide your {role} perspective in the specified JSON format."
                    ),
                },
            ],
            temperature=0.4,
            max_tokens=1024,
        )

        raw = response.choices[0].message.content or ""
        return _extract_json(raw)

    except Exception as e:
        return {"error": str(e), "role": role}


async def argue_case(case_text: str, mode: str = "all") -> dict:
    """
    Main function to generate arguments based on mode.
    mode: 'plaintiff' | 'defendant' | 'judge' | 'all'
    """
    results = {}

    if mode == "all":
        plaintiff, defendant, judge = await asyncio.gather(
            generate_argument(case_text, "plaintiff"),
            generate_argument(case_text, "defendant"),
            generate_argument(case_text, "judge"),
        )
        results = {
            "plaintiff": plaintiff,
            "defendant": defendant,
            "judge": judge,
        }

    elif mode == "plaintiff":
        results["plaintiff"] = await generate_argument(case_text, "plaintiff")

    elif mode == "defendant":
        results["defendant"] = await generate_argument(case_text, "defendant")

    elif mode == "judge":
        results["judge"] = await generate_argument(case_text, "judge")

    else:
        results["error"] = f"Invalid mode: {mode}"

    return results


async def practice_mode(case_text: str, user_side: str, user_argument: str) -> dict:
    """
    Practice mode: user submits their own argument, AI responds as the opposing side
    and the judge evaluates both.
    user_side: 'plaintiff' | 'defendant'
    """
    if client is None:
        return {
            "error": "GROQ_API_KEY is not set. Please add it to your environment or .env file."
        }

    opposing_side = "defendant" if user_side == "plaintiff" else "plaintiff"

    practice_system = f"""You are an expert {opposing_side}'s attorney. The user has presented
their argument as the {user_side}. Your job is to:
1. Identify the weaknesses in their argument
2. Present strong counter-arguments from the {opposing_side}'s perspective
3. Point out any legal issues or missed opportunities in their reasoning

Be specific, constructive, and educational — this is a learning exercise.
Respond in JSON:
{{
  "counter_opening": "...",
  "weaknesses_found": ["..."],
  "counter_arguments": ["..."],
  "advice": "..."
}}"""

    eval_system = f"""You are a judge evaluating a legal practice session.
The student argued as the {user_side}. An AI played {opposing_side}.
Evaluate the student's argument quality and provide feedback.

Respond in JSON:
{{
  "score": 0,
  "strengths": ["..."],
  "improvements": ["..."],
  "verdict": "...",
  "overall_feedback": "..."
}}"""

    async def get_opposition():
        try:
            resp = await client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": practice_system},
                    {
                        "role": "user",
                        "content": f"Case:\n{case_text}\n\nStudent's {user_side} argument:\n{user_argument}",
                    },
                ],
                temperature=0.4,
                max_tokens=1024,
            )
            return _extract_json(resp.choices[0].message.content or "")
        except Exception as e:
            return {"error": str(e)}

    async def get_evaluation():
        try:
            resp = await client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": eval_system},
                    {
                        "role": "user",
                        "content": f"Case:\n{case_text}\n\nStudent's argument:\n{user_argument}",
                    },
                ],
                temperature=0.4,
                max_tokens=1024,
            )
            return _extract_json(resp.choices[0].message.content or "")
        except Exception as e:
            return {"error": str(e)}

    opposition, evaluation = await asyncio.gather(get_opposition(), get_evaluation())

    return {
        "user_side": user_side,
        "opposition": opposition,
        "evaluation": evaluation,
    }