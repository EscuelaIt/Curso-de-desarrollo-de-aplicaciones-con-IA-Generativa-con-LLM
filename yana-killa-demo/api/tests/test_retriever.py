import pytest
from pathlib import Path
from app.db.database import init_db, get_connection
from app.rag.ingest import ingest_pdf
from app.rag.embedder import Embedder
from app.rag.retriever import hybrid_search

FIXT = Path(__file__).parent / "fixtures" / "sample.pdf"

@pytest.fixture(scope="module")
def embedder():
    return Embedder()

def test_hybrid_search_returns_relevant_chunks(tmp_path, embedder):
    db = str(tmp_path / "t.sqlite")
    init_db(db)
    conn = get_connection(db)
    ingest_pdf(conn, str(FIXT), "Sample", embedder, str(tmp_path / "md"))
    results = hybrid_search(conn, embedder, query="Página uno", top_k=3)
    assert len(results) >= 1
    assert "uno" in results[0].chunk.text.lower() or results[0].chunk.page == 1
