from langdetect import detect, detect_langs

def detect_language(text):
    try:
        # Get language probabilities
        langs = detect_langs(text)
        top = langs[0]
        
        # Only translate if confidence is high AND it's not English
        if top.lang != 'en' and top.prob > 0.90:
            return top.lang
        
        # Default to English if unsure
        return 'en'
    except:
        return 'en'