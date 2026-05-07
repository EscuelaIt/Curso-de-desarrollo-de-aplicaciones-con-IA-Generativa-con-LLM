from pathlib import Path
from app.rag.pdf_to_markdown import pdf_to_markdown_pages

FIXT = Path(__file__).parent / "fixtures" / "sample.pdf"

def test_pdf_to_markdown_yields_per_page():
    pages = pdf_to_markdown_pages(str(FIXT))
    assert len(pages) == 2
    assert "Página uno" in pages[0].text
    assert pages[0].page_number == 1
    assert "Página dos" in pages[1].text
