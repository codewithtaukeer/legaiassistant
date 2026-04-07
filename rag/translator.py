from deep_translator import GoogleTranslator

# Max characters GoogleTranslator accepts per request
_CHUNK_SIZE = 4500


def translate_to_english(text: str) -> str:
    """
    Translate any language to English.
    Returns the original text unchanged if translation fails.
    """
    try:
        return GoogleTranslator(source="auto", target="en").translate(text)
    except Exception:
        return text


def translate_from_english(text: str, target_lang: str) -> str:
    """
    Translate English text into `target_lang`.

    - "en" and "hinglish" are passed through without translation.
    - Long texts are split into chunks to stay within API limits.
    - Any chunk that fails is kept in English rather than crashing.

    Parameters
    ----------
    text        : English text to translate.
    target_lang : Language code returned by detect_language()
                  e.g. "hi", "ta", "bn", "hinglish", "en".

    Returns
    -------
    Translated string (or original if target is en/hinglish).
    """
    # No translation needed for these
    if target_lang in ("en", "hinglish"):
        return text

    chunks = [text[i: i + _CHUNK_SIZE] for i in range(0, len(text), _CHUNK_SIZE)]
    translated_chunks = []

    for chunk in chunks:
        try:
            translated = GoogleTranslator(
                source="en", target=target_lang
            ).translate(chunk)
            translated_chunks.append(translated)
        except Exception:
            # Keep the English chunk rather than losing it entirely
            translated_chunks.append(chunk)

    return " ".join(translated_chunks)