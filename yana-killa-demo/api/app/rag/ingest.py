import hashlib
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from .pdf_to_markdown import pdf_to_markdown_pages
from .chunker import chunk_pages
from .embedder import Embedder
from ..db.models import Document, Chunk
from ..db.repository import insert_document, insert_chunk, insert_chunk_embedding

def _make_doc_id(path: str) -> str:
    return "doc_" + hashlib.md5(path.encode()).hexdigest()[:12]

def _make_chunk_id(doc_id: str, ordinal: int) -> str:
    return f"{doc_id}_c{ordinal}"

def ingest_pdf(
    conn: sqlite3.Connection,
    pdf_path: str,
    title: str,
    embedder: Embedder,
    markdown_out_dir: str,
    doc_type: str | None = None,
    zone: str | None = None,
    campaign: str | None = None,
    progress_callback=None,
) -> str:
    doc_id = _make_doc_id(pdf_path)
    Path(markdown_out_dir).mkdir(parents=True, exist_ok=True)

    if progress_callback: progress_callback("converting", 0)
    pages = pdf_to_markdown_pages(pdf_path)

    md_path = str(Path(markdown_out_dir) / f"{doc_id}.md")
    Path(md_path).write_text("\n\n---\n\n".join(p.text for p in pages), encoding="utf-8")

    if progress_callback: progress_callback("chunking", 20)
    chunks = chunk_pages(pages)

    if progress_callback: progress_callback("embedding", 40)
    texts = [c.text for c in chunks]
    vectors = embedder.embed_many(texts) if texts else []

    if progress_callback: progress_callback("storing", 80)
    insert_document(conn, Document(
        id=doc_id, title=title, filename=Path(pdf_path).name,
        doc_type=doc_type, zone=zone, campaign=campaign,
        page_count=len(pages),
        ingested_at=datetime.now(timezone.utc).isoformat(),
        source_path=pdf_path, markdown_path=md_path,
    ))
    for c, v in zip(chunks, vectors):
        cid = _make_chunk_id(doc_id, c.ordinal)
        insert_chunk(conn, Chunk(
            id=cid, doc_id=doc_id, ordinal=c.ordinal,
            page=c.page, heading=c.heading,
            text=c.text, token_count=c.token_count,
        ))
        insert_chunk_embedding(conn, cid, v)

    if progress_callback: progress_callback("done", 100)
    return doc_id
