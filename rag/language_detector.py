from langdetect import detect_langs

HINGLISH_KEYWORDS = [
    "kaise", "kya", "karo", "karein", "ke liye", "hai", "hain", "nahi", "kab",
    "kyun", "kyunki", "aur", "ya", "lekin", "mujhe", "mera", "meri", "mere",
    "tum", "aap", "woh", "yeh", "iska", "uska", "batao", "bata", "chahiye",
    "milega", "milegi", "lagta", "lagti", "kuch", "sab", "sirf", "bahut",
    "accha", "theek", "pata", "samjho", "samjhao", "lelo", "dedo", "matlab"
]

def detect_language(text: str) -> str:
    text_lower = text.lower()

    # Check for Hinglish keywords first
    hinglish_count = sum(1 for word in HINGLISH_KEYWORDS if word in text_lower)
    if hinglish_count >= 1:
        return "hinglish"

    try:
        results = detect_langs(text)
        for r in results:
            if r.prob > 0.90:
                return r.lang
        return "en"
    except:
        return "en"