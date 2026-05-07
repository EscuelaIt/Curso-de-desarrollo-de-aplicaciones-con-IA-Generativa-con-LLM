import sqlite3
import struct
from dataclasses import dataclass
from typing import List
from ..db.models import Chunk
from ..db.repository import get_chunks_by_ids
from .embedder import Embedder


@dataclass
class RetrievedChunk:
    chunk: Chunk
    score: float
    doc_title: str
    doc_filename: str


def _bm25_search(conn: sqlite3.Connection, query: str, top_k: int) -> list[tuple[str, float]]:
    rows = conn.execute(
        """SELECT id, bm25(chunks_fts) AS rank FROM chunks_fts
           WHERE chunks_fts MATCH ?
           ORDER BY rank LIMIT ?""",
        (query, top_k)
    ).fetchall()
    return [(r["id"], -r["rank"]) for r in rows]


def _vector_search(conn: sqlite3.Connection, query_vec: list[float], top_k: int) -> list[tuple[str, float]]:
    blob = struct.pack(f"{len(query_vec)}f", *query_vec)
    rows = conn.execute(
        """SELECT chunk_id, distance FROM chunks_vec
           WHERE embedding MATCH ? AND k=?
           ORDER BY distance""",
        (blob, top_k)
    ).fetchall()
    return [(r["chunk_id"], 1.0 - r["distance"]) for r in rows]


def _rrf(result_sets: list[list[tuple[str, float]]], k: int = 60) -> list[tuple[str, float]]:
    scores: dict[str, float] = {}
    for results in result_sets:
        for rank, (cid, _) in enumerate(results):
            scores[cid] = scores.get(cid, 0) + 1.0 / (k + rank + 1)
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)


def hybrid_search(
    conn: sqlite3.Connection,
    embedder: Embedder,
    query: str,
    top_k: int = 8,
    candidates: int = 20,
    max_per_doc: int = 3,
) -> List[RetrievedChunk]:
    # Sanitize FTS query (escape double quotes, wrap for phrase match)
    safe = query.replace('"', '""')
    bm25: list[tuple[str, float]] = []
    if safe.strip():
        try:
            bm25 = _bm25_search(conn, f'"{safe}"', candidates)
        except sqlite3.OperationalError:
            pass
        if not bm25:
            try:
                bm25 = _bm25_search(conn, " OR ".join(safe.split()), candidates)
            except sqlite3.OperationalError:
                pass

    vec_q = embedder.embed_one(query)
    vec = _vector_search(conn, vec_q, candidates)

    fused = _rrf([bm25, vec])[:candidates]
    pool_ids = [cid for cid, _ in fused]
    chunks = {c.id: c for c in get_chunks_by_ids(conn, pool_ids)}

    per_doc_count: dict[str, int] = {}
    diversified: list[tuple[str, float]] = []
    for cid, score in fused:
        c = chunks.get(cid)
        if not c:
            continue
        if per_doc_count.get(c.doc_id, 0) >= max_per_doc:
            continue
        diversified.append((cid, score))
        per_doc_count[c.doc_id] = per_doc_count.get(c.doc_id, 0) + 1
        if len(diversified) >= top_k:
            break

    doc_ids = {chunks[cid].doc_id for cid, _ in diversified}
    docs = (
        {
            r["id"]: (r["title"], r["filename"])
            for r in conn.execute(
                f"SELECT id, title, filename FROM documents WHERE id IN ({','.join(['?']*len(doc_ids))})",
                list(doc_ids),
            ).fetchall()
        }
        if doc_ids
        else {}
    )

    out = []
    for cid, score in diversified:
        c = chunks.get(cid)
        if not c:
            continue
        title, filename = docs.get(c.doc_id, ("(desconocido)", ""))
        out.append(RetrievedChunk(chunk=c, score=score, doc_title=title, doc_filename=filename))
    return out
