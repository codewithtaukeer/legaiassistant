import ollama
import json
import re


def generate_answer(question, sections, history=[]):

    context_parts = []
    for s in sections:
        if "act" in s:
            context_parts.append(
                f"{s['act']} Section {s['section']} - {s['title']}: {s['text']}"
            )
        else:
            context_parts.append(s["text"])

    context = "\n\n".join(context_parts)

    history_text = ""
    if history:
        history_text = "PREVIOUS CONVERSATION:\n"
        for turn in history[-4:]:
            history_text += f"User: {turn['question']}\n"
            history_text += f"Assistant: {turn['answer']}\n"
        history_text += "\n"

    prompt = f"""
You are an expert assistant for Indian law.

Use ONLY the provided legal context to answer the question.
You may use the previous conversation to understand follow-up questions.

Rules:
1. Do NOT make up laws.
2. If the answer is not in the context say: "I could not find this in the provided legal documents."
3. Return ONLY raw JSON. No markdown, no backticks, no extra text.

LEGAL CONTEXT:
{context}

{history_text}
QUESTION:
{question}

Return ONLY this JSON:
{{
"answer": "...",
"relevant_laws": ["law names here"],
"summary": "short 2 sentence summary"
}}
"""

    response = ollama.chat(
        model="mistral",
        messages=[{"role": "user", "content": prompt}]
    )

    content = response.message.content
    content = re.sub(r"```json|```", "", content).strip()

    match = re.search(r'\{.*\}', content, re.DOTALL)
    if match:
        content = match.group()
    else:
        if not content.endswith("}"):
            content += "}"

    try:
        return json.loads(content)
    except:
        answer_match = re.search(r'"answer"\s*:\s*"(.*?)"', content, re.DOTALL)
        laws_match = re.search(r'"relevant_laws"\s*:\s*\[(.*?)\]', content, re.DOTALL)
        summary_match = re.search(r'"summary"\s*:\s*"(.*?)"', content, re.DOTALL)

        return {
            "answer": answer_match.group(1) if answer_match else content,
            "relevant_laws": laws_match.group(1).split(",") if laws_match else [],
            "summary": summary_match.group(1) if summary_match else "Unable to structure response."
        }