from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .routes import ingest, documents, search, chat, llm
from .auth import require_token
from .config import settings
from .deps import db_path
from .db.database import init_db, get_connection
from .db.repository import list_documents


@asynccontextmanager
async def lifespan(_app):
    init_db(db_path())
    conn = get_connection(db_path())
    try:
        docs = list_documents(conn)
    finally:
        conn.close()
    if len(docs) == 0:
        print("[startup] Index is empty. Run `make seed` to populate it with docs-piloto/.")
    if not settings.pilot_token:
        print("[startup] PILOT_TOKEN is empty — auth disabled (local dev mode).")
    yield


app = FastAPI(title="Yana Killa API", version="0.1.0", lifespan=lifespan)

_extra_origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_extra_origins,
    allow_origin_regex=r"http://localhost:\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


class LoginRequest(BaseModel):
    token: str


@app.post("/api/auth/login")
async def login(req: LoginRequest):
    if not settings.pilot_token:
        return {"status": "ok", "auth_required": False}
    if req.token != settings.pilot_token:
        raise HTTPException(status_code=401, detail="invalid_token")
    return {"status": "ok", "auth_required": True}


@app.get("/api/auth/check", dependencies=[Depends(require_token)])
async def check():
    return {"status": "ok", "auth_required": bool(settings.pilot_token)}


app.include_router(ingest.router)
app.include_router(documents.router)
app.include_router(search.router)
app.include_router(chat.router)
app.include_router(llm.router)
