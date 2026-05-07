from dataclasses import dataclass
from typing import List
import pymupdf4llm

@dataclass
class PageMarkdown:
    page_number: int
    text: str

def pdf_to_markdown_pages(pdf_path: str) -> List[PageMarkdown]:
    chunks = pymupdf4llm.to_markdown(pdf_path, page_chunks=True)
    return [
        PageMarkdown(page_number=c["metadata"]["page_number"], text=c["text"])
        for c in chunks
    ]
