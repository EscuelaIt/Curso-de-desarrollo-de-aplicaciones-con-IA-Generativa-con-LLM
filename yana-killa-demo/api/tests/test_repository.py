from app.db.database import init_db, get_connection
from app.db.repository import (
    insert_document, list_documents, get_document,
    insert_chunk, get_chunks_by_ids
)
from app.db.models import Document, Chunk

def _setup(tmp_path):
    db = str(tmp_path / "t.sqlite")
    init_db(db)
    return get_connection(db)

def test_insert_and_list_documents(tmp_path):
    conn = _setup(tmp_path)
    doc = Document(
        id="d1", title="DS-024", filename="ds024.pdf",
        doc_type="normativa", zone=None, campaign=None,
        page_count=100, ingested_at="2026-04-16T00:00:00",
        source_path="/x/ds024.pdf", markdown_path="/x/ds024.md"
    )
    insert_document(conn, doc)
    assert len(list_documents(conn)) == 1
    assert get_document(conn, "d1").title == "DS-024"

def test_insert_and_fetch_chunks(tmp_path):
    conn = _setup(tmp_path)
    insert_document(conn, Document(
        id="d1", title="x", filename="x.pdf", doc_type=None,
        zone=None, campaign=None, page_count=1,
        ingested_at="2026-04-16T00:00:00",
        source_path="/x/x.pdf", markdown_path=None
    ))
    insert_chunk(conn, Chunk(
        id="c1", doc_id="d1", ordinal=0, page=1,
        heading="Intro", text="hello world", token_count=2
    ))
    chunks = get_chunks_by_ids(conn, ["c1"])
    assert chunks[0].text == "hello world"
