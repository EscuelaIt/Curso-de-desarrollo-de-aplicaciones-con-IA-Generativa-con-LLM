from app.llm.citations import parse_response, CitationSpec

def test_parse_response_extracts_markers_and_citations():
    raw = '''{
      "answer_markdown": "Según el DS-024 [^1], trimestral [^2].",
      "citations": [
        {"id": 1, "chunk_id": "c1", "excerpt": "..."},
        {"id": 2, "chunk_id": "c2", "excerpt": "..."}
      ]
    }'''
    out = parse_response(raw)
    assert len(out.citations) == 2
    assert "[^1]" in out.answer_markdown

def test_parse_response_tolerates_stripped_prefix():
    raw = 'ignore this\n```json\n{"answer_markdown":"x","citations":[]}\n```'
    out = parse_response(raw)
    assert out.answer_markdown == "x"
