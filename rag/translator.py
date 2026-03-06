from deep_translator import GoogleTranslator


def translate_to_english(text):
    return GoogleTranslator(source='auto', target='en').translate(text)


def translate_from_english(text, target_lang):

    if target_lang == "en":
        return text

    max_length = 4500

    # split text into chunks
    chunks = [text[i:i + max_length] for i in range(0, len(text), max_length)]

    translated_chunks = []

    for chunk in chunks:
        translated = GoogleTranslator(source='en', target=target_lang).translate(chunk)
        translated_chunks.append(translated)

    return " ".join(translated_chunks)