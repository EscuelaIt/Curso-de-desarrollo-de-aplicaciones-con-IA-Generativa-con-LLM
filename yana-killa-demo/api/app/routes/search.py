import re
from fastapi import APIRouter, Depends
from ..auth import require_token
from ..deps import get_db, get_embedder
from ..rag.retriever import hybrid_search

router = APIRouter(prefix="/api", dependencies=[Depends(require_token)])

_PICTURE_BLOCK_RE = re.compile(
    r"\**-+\s*Start\s*of\s*picture\s*text\s*-+\**.*?\**-+\s*End\s*of\s*picture\s*text\s*-+\**",
    re.IGNORECASE | re.DOTALL,
)
_PICTURE_OMITTED_RE = re.compile(
    r"\**\s*[⇒→][^\n⇐←]*picture\s*\[[^\]]+\]\s*intentionally\s*omitted[^\n⇐←]*[⇐←]\s*\**",
    re.IGNORECASE,
)
_PAGE_MARKER_RE = re.compile(r"Pagina\s+\d+\s+de\s+\d+", re.IGNORECASE)
_HTML_TAG_RE = re.compile(r"<[^>]+>")
_MD_BOLD_RE = re.compile(r"\*\*+(.+?)\*\*+", re.DOTALL)
_MD_HEADER_RE = re.compile(r"#{1,6}(?=\s)")
_DOTTED_LINE_RE = re.compile(r"\.{4,}")
_PIPE_RUN_RE = re.compile(r"\s*\|+\s*")
_TABLE_SEP_FRAGMENT_RE = re.compile(r"(?:[-:]{2,}\s*){2,}")
_MULTI_SPACE_RE = re.compile(r"[ \t]+")
_MULTI_NEWLINE_RE = re.compile(r"\s*\n\s*")


def _clean_excerpt(text: str, max_chars: int = 400) -> str:
    if not text:
        return ""
    cleaned = _PICTURE_BLOCK_RE.sub(" ", text)
    cleaned = _PICTURE_OMITTED_RE.sub(" ", cleaned)
    cleaned = _PAGE_MARKER_RE.sub(" ", cleaned)
    cleaned = _HTML_TAG_RE.sub(" ", cleaned)
    cleaned = _MD_BOLD_RE.sub(r"\1", cleaned)
    cleaned = _MD_HEADER_RE.sub("", cleaned)
    cleaned = _DOTTED_LINE_RE.sub(" ", cleaned)
    cleaned = _PIPE_RUN_RE.sub(" ", cleaned)
    cleaned = _TABLE_SEP_FRAGMENT_RE.sub(" ", cleaned)
    cleaned = _MULTI_NEWLINE_RE.sub(" ", cleaned)
    cleaned = _MULTI_SPACE_RE.sub(" ", cleaned).strip()
    if len(cleaned) > max_chars:
        cleaned = cleaned[:max_chars].rstrip() + "…"
    return cleaned


@router.get("/search")
async def search(q: str, conn=Depends(get_db), embedder=Depends(get_embedder)):
    if not q.strip():
        return {"results": []}
    results = hybrid_search(conn, embedder, q, top_k=12)
    return {"results": [
        {
            "chunk_id": r.chunk.id,
            "doc_id": r.chunk.doc_id,
            "doc_title": r.doc_title,
            "doc_filename": r.doc_filename,
            "page": r.chunk.page,
            "heading": r.chunk.heading,
            "excerpt": _clean_excerpt(r.chunk.text),
            "score": r.score,
        } for r in results
    ]}
