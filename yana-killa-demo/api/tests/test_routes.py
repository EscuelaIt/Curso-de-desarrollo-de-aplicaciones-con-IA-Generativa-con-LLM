import pytest
from fastapi.testclient import TestClient
from pathlib import Path
import os

FIXT = Path(__file__).parent / "fixtures" / "sample.pdf"


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("data")
    os.environ["DATA_DIR"] = str(tmp)
    os.environ["DOCS_SEED_DIR"] = str(FIXT.parent)
    from app.config import settings
    settings.data_dir = str(tmp)
    settings.docs_seed_dir = str(FIXT.parent)
    settings.pilot_token = ""
    import app.deps as deps_mod
    deps_mod._embedder = None
    from app.main import app
    return TestClient(app)


def test_ingest_then_list(client):
    with open(FIXT, "rb") as f:
        r = client.post("/api/ingest", files={"file": ("sample.pdf", f, "application/pdf")})
    assert r.status_code == 200
    doc_id = r.json()["doc_id"]
    r = client.get("/api/documents")
    assert any(d["id"] == doc_id for d in r.json())


def test_search_returns_results(client):
    r = client.get("/api/search", params={"q": "Página"})
    assert r.status_code == 200
    body = r.json()
    assert "results" in body


def test_llm_models_lists_configured(client):
    r = client.get("/api/llm/models")
    assert r.status_code == 200
    assert "default" in r.json()
    assert "available" in r.json()
