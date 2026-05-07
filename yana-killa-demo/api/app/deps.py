from pathlib import Path
from .config import settings
from .db.database import init_db, get_connection
from .rag.embedder import Embedder

_embedder: Embedder | None = None

def db_path() -> str:
    return str(Path(settings.data_dir) / "index.sqlite")

def get_db():
    p = db_path()
    if not Path(p).exists():
        init_db(p)
    conn = get_connection(p)
    try:
        yield conn
    finally:
        conn.close()

def get_embedder() -> Embedder:
    global _embedder
    if _embedder is None:
        _embedder = Embedder()
    return _embedder

def markdown_dir() -> str:
    return str(Path(settings.data_dir) / "markdown")
