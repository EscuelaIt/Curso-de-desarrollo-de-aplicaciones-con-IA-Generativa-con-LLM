import pytest
from pathlib import Path
from app.db.database import init_db, get_connection
from app.db.repository import list_documents
from app.rag.ingest import ingest_pdf
from app.rag.embedder import Embedder

FIXT = Path(__file__).parent / "fixtures" / "sample.pdf"

@pytest.fixture(scope="module")
def embedder():
    return Embedder()

def test_ingest_pdf_creates_document_and_chunks(tmp_path, embedder):
    db = str(tmp_path / "t.sqlite")
    init_db(db)
    conn = get_connection(db)
    doc_id = ingest_pdf(
        conn=conn,
        pdf_path=str(FIXT),
        title="Sample",
        embedder=embedder,
        markdown_out_dir=str(tmp_path / "md"),
    )
    assert doc_id is not None
    docs = list_documents(conn)
    assert len(docs) == 1
    count = conn.execute("SELECT COUNT(*) FROM chunks WHERE doc_id=?", (doc_id,)).fetchone()[0]
    assert count >= 1
    vcount = conn.execute("SELECT COUNT(*) FROM chunks_vec").fetchone()[0]
    assert vcount == count
