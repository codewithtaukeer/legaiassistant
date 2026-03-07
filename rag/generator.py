import ollama
import json
import re


def generate_answer(question, sections, history=[], procedures=[], user_language="en", case_laws=[]):

    context_parts = []
    for s in sections:
        if "act" in s:
            context_parts.append(
                f"{s['act']} Section {s['section']} - {s['title']}: {s['text']}"
            )
        else:
            context_parts.append(s["text"])

    context = "\n\n".join(context_parts)

    procedure_context = ""
    if procedures:
        procedure_context = "\n\nGOVERNMENT PROCEDURE INFORMATION:\n"
        grouped = {}
        for p in procedures:
            name = p["process"]
            if name not in grouped:
                grouped[name] = []
            grouped[name].append(p)

        for process_name, steps in grouped.items():
            procedure_context += f"\n{process_name}:\n"
            for step in steps:
                procedure_context += f"  {step['step']}\n"
                procedure_context += f"  Documents: {step['documents_required']}\n"
                procedure_context += f"  Fees: {step['fees']}\n"
                procedure_context += f"  Time: {step['time']}\n"
                procedure_context += f"  Details: {step['details']}\n\n"

    case_law_context = ""
    if case_laws:
        case_law_context = "\n\nRELEVANT LANDMARK CASES:\n"
        for c in case_laws:
            case_law_context += f"\n{c['case_name']} ({c['court']}, {c['year']}):\n"
            case_law_context += f"  Summary: {c['summary']}\n"
            case_law_context += f"  Significance: {c['significance']}\n"

    history_text = ""
    if history:
        history_text = "PREVIOUS CONVERSATION:\n"
        for turn in history[-4:]:
            history_text += f"User: {turn['question']}\n"
            history_text += f"Assistant: {turn['answer']}\n"
        history_text += "\n"

    lang_instruction = ""
    if user_language == "hinglish":
        lang_instruction = """IMPORTANT: The user is writing in Hinglish (Hindi words in English script).
You MUST reply in the SAME Hinglish style — mix simple Hindi words written in English letters with English legal/technical terms.
Example style: "Aapko pehle parivahan.gov.in pe jaana hoga. Wahan Form 1 aur Form 2 fill karna hoga. Documents mein age proof, address proof aur 3 passport photos chahiye honge."
Do NOT use Devanagari script. Write Hindi words in English letters only."""
    elif user_language == "hi":
        lang_instruction = "IMPORTANT: Reply in Hindi using Devanagari script."

    prompt = f"""
You are an expert Indian legal assistant with comprehensive knowledge of Indian law and government procedures.

{lang_instruction}

LEGAL CONTEXT (from uploaded documents):
{context}
{procedure_context}
{case_law_context}

{history_text}

QUESTION:
{question}

Instructions:
1. If the answer is in the LEGAL CONTEXT or PROCEDURE INFORMATION, use it as your primary source and elaborate clearly.
2. Keep your "answer" field focused on the direct legal answer only — do NOT include case references in the answer field.
3. In the "case_analysis" field, for EACH relevant landmark case write a complete structured entry like this:
   **Case Name (Year) - Court Name**
   Facts: Brief facts of the case.
   Decision: What the court decided.
   Significance: Why this case matters and how it applies to the question.
   ---
   Write the FULL entry for each case. Do not summarize or cut short.
4. For government procedures, provide step-by-step guidance with exact documents required, fees and timeframes.
5. If the question is about Indian law but NOT in the context, answer ONLY if highly confident and add: "⚠️ This is based on general legal knowledge, not your uploaded documents."
6. NEVER guess specific section numbers or punishments you are not sure about.
7. Write like a helpful lawyer and government advisor explaining to a common citizen — clear, simple and practical.
8. Generate 3 related follow-up questions the user might want to ask next.
9. Return ONLY raw JSON. No markdown, no backticks, no extra text.

Return ONLY this JSON:
{{
"answer": "direct legal answer only, no case references here",
"case_analysis": "explanation of relevant landmark cases and what they established, or empty string if no relevant cases",
"relevant_laws": ["law or procedure names here"],
"summary": "short 2 sentence summary",
"related_questions": ["question 1", "question 2", "question 3"]
}}
"""

    response = ollama.chat(
        model="mistral",
        messages=[{"role": "user", "content": prompt}],
        options={"num_predict": 2048}
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
        parsed = json.loads(content)
        return {
            "answer": parsed.get("answer", content),
            "case_analysis": parsed.get("case_analysis", ""),
            "relevant_laws": parsed.get("relevant_laws", []),
            "summary": parsed.get("summary", ""),
            "related_questions": parsed.get("related_questions", [])
        }
    except:
        answer_match = re.search(r'"answer"\s*:\s*"(.*?)"', content, re.DOTALL)
        laws_match = re.search(r'"relevant_laws"\s*:\s*\[(.*?)\]', content, re.DOTALL)
        summary_match = re.search(r'"summary"\s*:\s*"(.*?)"', content, re.DOTALL)

        return {
            "answer": answer_match.group(1) if answer_match else content,
            "case_analysis": "",
            "relevant_laws": laws_match.group(1).split(",") if laws_match else [],
            "summary": summary_match.group(1) if summary_match else "",
            "related_questions": []
        } 