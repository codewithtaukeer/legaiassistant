import fitz  # PyMuPDF

def load_pdf_text(file_path):
    doc = fitz.open(file_path)
    full_text = ""
    for page in doc:
        full_text += page.get_text()
    return full_text


def load_pdf_with_pages(file_path):
    
    doc = fitz.open(file_path)
    pages = []
    for page_num, page in enumerate(doc, start=1):
        text = page.get_text()
        if text.strip():
            pages.append((page_num, text)) ##list of page number,text dega
    return pages