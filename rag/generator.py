import ollama
import json

def generate_answer(question, sections):

    context_parts = []

    for s in sections:

        # IPC / structured laws
        if "act" in s:
            context_parts.append(
                f"{s['act']} Section {s['section']} - {s['title']}: {s['text']}"
            )

        # PDF chunks
        else:
            context_parts.append(s["text"])

    context = "\n\n".join(context_parts)

    prompt = f"""
You are an expert assistant for Indian law.

Use ONLY the provided legal context to answer the question.

Rules:
1. Do NOT make up laws.
2. If the answer is not in the context say:
   "I could not find this in the provided legal documents."
3. Always return a valid JSON response.

LEGAL CONTEXT:
{context}

QUESTION:
{question}

Return ONLY JSON in this format:

{{
"answer": "...",
"relevant_laws": ["Article or Section names"],
"summary": "short 2 sentence summary"
}}
"""

    response = ollama.chat(
        model="mistral",
        messages=[{"role": "user", "content": prompt}]
    )

    content = response["message"]["content"]

    # Try to parse JSON safely
    try:
        return json.loads(content)
    except:
        return {
            "answer": content,
            "relevant_laws": [],
            "summary": "Unable to structure response."
        }