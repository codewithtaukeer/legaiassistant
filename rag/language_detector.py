import re
from langdetect import detect_langs

# ---------------------------------------------------------------------------
# Hinglish keyword list  (whole-word matched via \b)
# ---------------------------------------------------------------------------
HINGLISH_KEYWORDS = [
    "kaise", "kya", "karo", "karein", "ke liye", "hai", "hain", "nahi",
    "kab", "kyun", "kyunki", "aur", "lekin", "mujhe", "mera", "meri",
    "mere", "aap", "woh", "yeh", "iska", "uska", "batao", "bata",
    "chahiye", "milega", "milegi", "lagta", "lagti", "kuch", "sab",
    "sirf", "bahut", "accha", "theek", "pata", "samjho", "samjhao",
    "lelo", "dedo", "matlab", "toh", "bhi", "abhi", "agar", "phir",
    "kaisa", "kaisi", "tumhara", "apna", "apni", "humara", "humari",
    "ji", "hoga", "hogi", "raha", "rahi", "rahe", "gaya",
    "gayi", "dena", "lena", "karna", "karte", "karti", "karta",
]

# Minimum word count before we trust langdetect
MIN_WORDS_FOR_DETECTION = 4

# Languages we will accept from langdetect (ISO 639-1 codes).
# Anything outside this set falls back to session_lang.
SUPPORTED_LANGS = {"en", "hi", "ta", "te", "kn", "ml", "mr", "bn", "gu", "pa"}


def _is_too_short(text: str) -> bool:
    """Return True if the text has too few words to trust langdetect."""
    return len(text.strip().split()) < MIN_WORDS_FOR_DETECTION


def _hinglish_score(text: str) -> int:
    """Count Hinglish keywords that appear as whole words."""
    text_lower = text.lower()
    return sum(
        1 for kw in HINGLISH_KEYWORDS
        if re.search(r"\b" + re.escape(kw) + r"\b", text_lower)
    )


def detect_language(text: str, session_lang: str = "en") -> str:
    """
    Detect the language of `text`.

    Priority order:
    1. Too short / just a name  →  keep session_lang unchanged.
    2. Two or more Hinglish keywords found  →  "hinglish".
    3. langdetect confident (>0.85) and lang in SUPPORTED_LANGS  →  that lang.
    4. Fallback  →  session_lang.

    Parameters
    ----------
    text         : The user's raw input message.
    session_lang : Language detected in the previous turn (default "en").
                   Short inputs will simply return this value unchanged.

    Returns
    -------
    Language code: "en", "hinglish", "hi", "ta", "te", "kn", etc.
    """
    stripped = text.strip()

    # Rule 1: too short to trust any detector
    if _is_too_short(stripped):
        return session_lang

    # Rule 2: Hinglish check (requires at least 2 keyword hits to avoid
    # false positives from words like "aur" appearing in unrelated names)
    if _hinglish_score(stripped) >= 2:
        return "hinglish"

    # Rule 3: langdetect with strict confidence + allowlist filter
    try:
        results = detect_langs(stripped)
        for r in results:
            if r.prob > 0.85 and r.lang in SUPPORTED_LANGS:
                return r.lang
    except Exception:
        pass

    # Rule 4: fall back to current session language
    return session_lang