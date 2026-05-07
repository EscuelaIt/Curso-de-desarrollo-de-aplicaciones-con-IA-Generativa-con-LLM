from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, UploadFile, File
from ..auth import require_token
from ..deps import db_path, get_db, get_embedder, markdown_dir
from ..db.database import get_connection
from ..db.models import Document
from ..db.repository import get_document, insert_document
from ..rag.ingest import _make_doc_id, ingest_pdf
from ..config import settings
from ..rate_limit import rate_limit

router = APIRouter(
    prefix="/api",
    dependencies=[
        Depends(require_token),
        Depends(rate_limit("ingest", settings.rate_limit_ingest_per_hour)),
    ],
)


def _run_ingest(pdf_path: str, title: str, doc_type: str | None, zone: str | None, doc_id: str) -> None:
    """Background task: corre ingest_pdf en una conexion sqlite fresca.
    sqlite3 no comparte conexion entre threads, asi que abrimos una aqui.
    El placeholder con status='processing' creado por el endpoint queda visible
    en /api/documents durante todo el OCR; ingest_pdf lo reemplaza atomicamente
    al final via INSERT OR REPLACE en repository.insert_document."""
    conn = get_connection(db_path())
    try:
        embedder = get_embedder()
        ingest_pdf(
            conn=conn,
            pdf_path=pdf_path,
            title=title,
            embedder=embedder,
            markdown_out_dir=markdown_dir(),
            doc_type=doc_type or None,
            zone=zone or None,
        )
    except Exception as e:
        try:
            # Cleanup de chunks parciales si ingest_pdf fallo a mitad.
            conn.execute("DELETE FROM chunks WHERE doc_id=?", (doc_id,))
            conn.execute("DELETE FROM chunks_fts WHERE id LIKE ?", (f"{doc_id}_c%",))
            conn.execute(
                """INSERT OR REPLACE INTO documents
                   (id, title, filename, doc_type, zone, campaign, status,
                    page_count, ingested_at, source_path, markdown_path)
                   VALUES (?,?,?,?,?,NULL,'failed',0,?,?,NULL)""",
                (doc_id, title, Path(pdf_path).name, doc_type, zone,
                 datetime.now(timezone.utc).isoformat(), pdf_path),
            )
            conn.commit()
        except Exception:
            pass
        print(f"[ingest] background task failed for {doc_id}: {e}")
    finally:
        conn.close()


@router.post("/ingest")
async def ingest(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    doc_type: str | None = Form(None),
    zone: str | None = Form(None),
    conn=Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "only_pdf_supported")
    raw_dir = Path(settings.data_dir) / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    dest = raw_dir / file.filename
    max_bytes = settings.max_upload_mb * 1024 * 1024
    written = 0
    with dest.open("wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            written += len(chunk)
            if written > max_bytes:
                out.close()
                dest.unlink(missing_ok=True)
                raise HTTPException(413, f"file_exceeds_{settings.max_upload_mb}mb")
            out.write(chunk)

    doc_id = _make_doc_id(str(dest))
    title = Path(file.filename).stem
    existing = get_document(conn, doc_id)
    if existing and existing.status == "approved":
        return {"doc_id": doc_id, "filename": file.filename, "status": "approved"}

    if existing:
        conn.execute(
            "UPDATE documents SET status='processing', doc_type=?, zone=?, ingested_at=? WHERE id=?",
            (doc_type, zone, datetime.now(timezone.utc).isoformat(), doc_id),
        )
        conn.commit()
    else:
        insert_document(conn, Document(
            id=doc_id, title=title, filename=file.filename,
            doc_type=doc_type, zone=zone, campaign=None,
            status="processing",
            page_count=0,
            ingested_at=datetime.now(timezone.utc).isoformat(),
            source_path=str(dest), markdown_path=None,
        ))

    background_tasks.add_task(_run_ingest, str(dest), title, doc_type, zone, doc_id)
    return {"doc_id": doc_id, "filename": file.filename, "status": "processing"}
