# app/services/pdf_service.py
import fitz  # PyMuPDF
from typing import List

def extract_text_from_pdf(path: str) -> str:
    doc = fitz.open(path)
    pages = []
    for p in doc:
        pages.append(p.get_text("text"))
    return "\n\n".join(pages)
