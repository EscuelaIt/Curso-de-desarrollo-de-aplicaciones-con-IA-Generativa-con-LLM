import pytest
from app.rag.embedder import Embedder

@pytest.fixture(scope="module")
def embedder():
    return Embedder()

def test_embedder_outputs_1024_dim_vector(embedder):
    vec = embedder.embed_one("informe hidrogeológico")
    assert len(vec) == 1024
    assert all(isinstance(x, float) for x in vec)

def test_embedder_batch(embedder):
    vecs = embedder.embed_many(["hola", "mundo", "acuífero"])
    assert len(vecs) == 3
    assert all(len(v) == 1024 for v in vecs)
