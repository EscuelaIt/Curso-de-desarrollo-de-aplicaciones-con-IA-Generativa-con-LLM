from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from ..auth import require_token
from ..deps import get_db
from ..db.repository import list_documents, get_document

router = APIRouter(prefix="/api", dependencies=[Depends(require_token)])

@router.get("/documents")
async def list_all(conn=Depends(get_db)):
    return [d.__dict__ for d in list_documents(conn)]

@router.get("/documents/{doc_id}")
async def detail(doc_id: str, conn=Depends(get_db)):
    d = get_document(conn, doc_id)
    if not d:
        raise HTTPException(404)
    return d.__dict__

@router.get("/documents/{doc_id}/file")
async def get_file(doc_id: str, conn=Depends(get_db)):
    d = get_document(conn, doc_id)
    if not d:
        raise HTTPException(404)
    if not Path(d.source_path).exists():
        raise HTTPException(404, "file missing")
    return FileResponse(d.source_path, media_type="application/pdf")
