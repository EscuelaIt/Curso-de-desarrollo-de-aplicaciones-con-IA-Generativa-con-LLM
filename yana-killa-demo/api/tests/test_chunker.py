from app.rag.chunker import chunk_pages, Chunk
from app.rag.pdf_to_markdown import PageMarkdown

def test_chunker_respects_token_budget():
    pages = [PageMarkdown(page_number=1, text="# Intro\n\n" + "word " * 1000)]
    chunks = chunk_pages(pages, target_tokens=200, overlap_tokens=20)
    assert all(c.token_count <= 260 for c in chunks)
    assert len(chunks) >= 4

def test_chunker_preserves_heading_context():
    pages = [PageMarkdown(
        page_number=1,
        text="# Capítulo 1\n\n" + "a " * 500 + "\n\n## Sección 1.1\n\n" + "b " * 100
    )]
    chunks = chunk_pages(pages, target_tokens=150, overlap_tokens=10)
    assert any(c.heading and "Capítulo 1" in c.heading for c in chunks)
    assert any(c.heading and "Sección 1.1" in c.heading for c in chunks)

def test_chunker_assigns_page_numbers():
    pages = [
        PageMarkdown(page_number=1, text="word " * 300),
        PageMarkdown(page_number=2, text="other " * 300),
    ]
    chunks = chunk_pages(pages, target_tokens=200, overlap_tokens=20)
    assert any(c.page == 1 for c in chunks)
    assert any(c.page == 2 for c in chunks)
