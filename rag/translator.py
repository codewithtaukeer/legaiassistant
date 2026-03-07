from deep_translator import GoogleTranslator


def translate_to_english(text: str) -> str:
    try:
        return GoogleTranslator(source='auto', target='en').translate(text)
    except:
        return text


def translate_from_english(text: str, target_lang: str) -> str:
    # English or Hinglish — no translation needed, model handles it via prompt
    if target_lang in ("en", "hinglish"):
        return text

    max_length = 4500
    chunks = [text[i:i + max_length] for i in range(0, len(text), max_length)]

    translated_chunks = []
    for chunk in chunks:
        try:
            translated = GoogleTranslator(source='en', target=target_lang).translate(chunk)
            translated_chunks.append(translated)
        except:
            translated_chunks.append(chunk)

    return " ".join(translated_chunks)