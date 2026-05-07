import tempfile
import pathlib
from app.db.database import init_db, get_connection

def test_init_db_creates_tables(tmp_path):
    db_path = tmp_path / "test.sqlite"
    init_db(str(db_path))
    conn = get_connection(str(db_path))
    tables = {r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()}
    assert "documents" in tables
    assert "chunks" in tables
    assert "conversations" in tables
    assert "messages" in tables

def test_init_db_creates_vector_and_fts(tmp_path):
    db_path = tmp_path / "test.sqlite"
    init_db(str(db_path))
    conn = get_connection(str(db_path))
    names = {r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type IN ('virtual','table')"
    ).fetchall()}
    assert "chunks_vec" in names
    assert "chunks_fts" in names
