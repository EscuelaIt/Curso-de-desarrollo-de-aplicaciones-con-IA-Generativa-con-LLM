from typing import List
from ..rag.retriever import RetrievedChunk

SYSTEM_PROMPT = """Eres el Asistente Hidrogeológico de Yana Killa. Respondes en español técnico, claro y conciso, citando SIEMPRE las fuentes documentales que usaste.

Reglas:
- Usa únicamente la información de los FRAGMENTOS proporcionados. Si la información no aparece en ningún fragmento, responde explícitamente: "No encuentro esa información en los documentos indexados."
- Nunca inventes datos, nombres de informes, valores numéricos ni fechas.
- Cada afirmación relevante debe incluir una cita en formato [^N] donde N es el id del fragmento que la soporta.
- Entrega la respuesta como JSON exacto con este esquema:
{
  "answer_markdown": "texto en markdown con marcadores [^1], [^2], ...",
  "citations": [{"id": 1, "chunk_id": "<id>", "excerpt": "<20-40 palabras>"}]
}
No agregues texto fuera del JSON. No envuelvas en backticks a menos que sea necesario."""

def build_user_prompt(query: str, chunks: List[RetrievedChunk]) -> str:
    frags = []
    for i, rc in enumerate(chunks, start=1):
        frags.append(
            f"[FRAGMENTO {i}] chunk_id={rc.chunk.id} doc=\"{rc.doc_title}\" página={rc.chunk.page}\n"
            f"{rc.chunk.text}"
        )
    return (
        f"PREGUNTA:\n{query}\n\n"
        f"FRAGMENTOS RECUPERADOS:\n" + "\n\n".join(frags) +
        "\n\nResponde con el JSON exacto."
    )
