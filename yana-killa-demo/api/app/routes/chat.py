import json
import time
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from ..auth import require_token
from ..deps import get_db, get_embedder
from ..config import settings
from ..rag.retriever import hybrid_search
from ..llm.prompts import SYSTEM_PROMPT, build_user_prompt
from ..llm.adapter import stream_completion
from ..llm.citations import AnswerStreamExtractor, parse_response
from ..rate_limit import rate_limit

router = APIRouter(
    prefix="/api",
    dependencies=[
        Depends(require_token),
        Depends(rate_limit("chat", settings.rate_limit_chat_per_hour)),
    ],
)

class ChatRequest(BaseModel):
    query: str
    model: str | None = None

@router.post("/chat")
async def chat(
    req: ChatRequest,
    conn=Depends(get_db),
    embedder=Depends(get_embedder),
):
    async def gen():
        t0 = time.time()
        model = req.model or settings.llm_model
        try:
            retrieved = hybrid_search(conn, embedder, req.query, top_k=8)
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'message': f'Retriever error: {e}'})}\n\n"
            return
        chunk_map = {r.chunk.id: r for r in retrieved}
        yield f"event: retrieved\ndata: {json.dumps([{'chunk_id': r.chunk.id, 'doc_title': r.doc_title, 'page': r.chunk.page} for r in retrieved])}\n\n"

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_prompt(req.query, retrieved)},
        ]
        buffer = ""
        extractor = AnswerStreamExtractor()
        answer_signaled = False
        try:
            async for delta in stream_completion(model, messages):
                buffer += delta
                clean = extractor.feed(delta)
                if clean:
                    yield f"event: token\ndata: {json.dumps({'delta': clean})}\n\n"
                if not answer_signaled and extractor.done:
                    answer_signaled = True
                    yield "event: answer_complete\ndata: {}\n\n"
        except Exception as e:
            msg = str(e)
            hint = ""
            low = msg.lower()
            if "api_key" in low or "api key" in low or "authentication" in low or "401" in low:
                hint = f" (verifica la API key del proveedor en .env para el modelo '{model}')"
            elif "connection" in low or "timeout" in low:
                hint = " (problema de red al llegar al proveedor LLM)"
            elif "not found" in low or "404" in low or "model" in low:
                hint = f" (el modelo '{model}' puede no existir o estar deprecated)"
            yield f"event: error\ndata: {json.dumps({'message': f'LLM error: {msg}{hint}'})}\n\n"
            return

        try:
            parsed = parse_response(buffer)
            citations_enriched = []
            for c in parsed.citations:
                src = chunk_map.get(c.chunk_id)
                citations_enriched.append({
                    "id": c.id,
                    "chunk_id": c.chunk_id,
                    "doc_id": src.chunk.doc_id if src else None,
                    "doc_title": src.doc_title if src else "",
                    "doc_filename": src.doc_filename if src else "",
                    "page": src.chunk.page if src else None,
                    "excerpt": c.excerpt or (src.chunk.text[:240] if src else ""),
                })
            final = {
                "answer_markdown": parsed.answer_markdown,
                "citations": citations_enriched,
                "latency_ms": int((time.time() - t0) * 1000),
            }
        except Exception as e:
            final = {"answer_markdown": buffer, "citations": [], "error": f"parse_failed: {e}"}
        yield f"event: final\ndata: {json.dumps(final)}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")
