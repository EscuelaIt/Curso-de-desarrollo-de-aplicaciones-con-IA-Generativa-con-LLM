import sqlite3
from typing import Iterable
from .models import Document, Chunk

def insert_document(conn: sqlite3.Connection, doc: Document) -> None:
    # INSERT OR REPLACE para soportar el flujo async: /api/ingest crea un
    # placeholder con status='processing' y el background task lo reemplaza
    # al terminar OCR+embeddings con la fila final (status='approved').
    conn.execute(
        """INSERT OR REPLACE INTO documents
           (id, title, filename, doc_type, zone, campaign, status,
            page_count, ingested_at, source_path, markdown_path)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
        (doc.id, doc.title, doc.filename, doc.doc_type, doc.zone,
         doc.campaign, doc.status, doc.page_count, doc.ingested_at,
         doc.source_path, doc.markdown_path)
    )
    conn.commit()

def get_document(conn: sqlite3.Connection, doc_id: str) -> Document | None:
    row = conn.execute("SELECT * FROM documents WHERE id=?", (doc_id,)).fetchone()
    return Document(**dict(row)) if row else None

def list_documents(conn: sqlite3.Connection) -> list[Document]:
    rows = conn.execute("SELECT * FROM documents ORDER BY ingested_at DESC").fetchall()
    return [Document(**dict(r)) for r in rows]

def insert_chunk(conn: sqlite3.Connection, chunk: Chunk) -> None:
    conn.execute(
        """INSERT INTO chunks (id, doc_id, ordinal, page, heading, text, token_count)
           VALUES (?,?,?,?,?,?,?)""",
        (chunk.id, chunk.doc_id, chunk.ordinal, chunk.page,
         chunk.heading, chunk.text, chunk.token_count)
    )
    conn.execute(
        "INSERT INTO chunks_fts (rowid, id, text) SELECT rowid, id, text FROM chunks WHERE id=?",
        (chunk.id,)
    )
    conn.commit()

def insert_chunk_embedding(conn: sqlite3.Connection, chunk_id: str, embedding: list[float]) -> None:
    import struct
    blob = struct.pack(f"{len(embedding)}f", *embedding)
    conn.execute(
        "INSERT INTO chunks_vec (chunk_id, embedding) VALUES (?, ?)",
        (chunk_id, blob)
    )
    conn.commit()

def get_chunks_by_ids(conn: sqlite3.Connection, ids: Iterable[str]) -> list[Chunk]:
    ids = list(ids)
    if not ids:
        return []
    placeholders = ",".join("?" * len(ids))
    rows = conn.execute(
        f"SELECT * FROM chunks WHERE id IN ({placeholders})", ids
    ).fetchall()
    return [Chunk(
        id=r["id"], doc_id=r["doc_id"], ordinal=r["ordinal"],
        page=r["page"], heading=r["heading"], text=r["text"],
        token_count=r["token_count"]
    ) for r in rows]
