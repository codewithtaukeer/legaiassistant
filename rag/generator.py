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
You are an expert Indian legal assistant with comprehensive knowledge of Indian law.

LEGAL CONTEXT (from uploaded documents):
{context}

{history_text}

QUESTION: 
{question}

Instructions:
1. If the answer is in the LEGAL CONTEXT, use it as your primary source and elaborate clearly.
2. If the question is about Indian law but NOT in the context:
   - Answer ONLY if you are highly confident about the legal facts
   - Clearly mention: "This is based on general legal knowledge, not your uploaded documents."
   - Include the correct Act name, section number, and punishment only if you are 100% sure
3. If you are NOT confident about specific legal details, say: "I am not fully certain about the specifics of this. Please consult a qualified lawyer or upload the relevant legal document."
4. NEVER guess or approximate section numbers, punishments, or legal provisions.
5. Write like a lawyer explaining to a client — clear, simple, and helpful.
6. Return ONLY raw JSON. No markdown, no backticks, no extra text.

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