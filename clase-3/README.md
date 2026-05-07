# Clase 3 — RAG (*retrieval augmented generation*)

> Clase 3 (de 5) del curso *Arquitectura de Aplicaciones con IA Generativa* — EscuelaIT.
> Nivel: desarrolladores intermedio-avanzados.

---

## Qué vas a aprender

Al terminar esta clase deberías ser capaz de:

1. Distinguir **prompting**, **RAG** y **fine-tuning** como respuestas arquitectónicas distintas, y decidir cuándo usar cada una en función de coste, frescura de datos y tipo de tarea.
2. Explicar qué es un **embedding**, cómo se entrena (contrastivo), y por qué la **similitud coseno** es la medida canónica para recuperar por significado.
3. Describir la anatomía de un sistema RAG — *chunking*, *vector store*, *retrieval*, *augmented generation*, *citaciones*.
4. Implementar un RAG mínimo funcional con SQLite puro y `sentence-transformers`, entendiendo cada paso sin cajas negras.
5. Reconocer estrategias de **chunking** y **retrieval** de producción (híbrido, reranking, HyDE), los modos de fallo típicos y los casos donde RAG sobra.

---

## Contenidos

| # | Bloque | Material |
|---|---|---|
| 0 | **Apertura + puente desde clase 2** — ¿qué pasa cuando el conocimiento no está en el modelo? | `01-conceptos.ipynb` |
| 1 | **Cuatro límites del LLM puro** — cutoff, privacidad, alucinaciones, ventana de contexto. | `01-conceptos.ipynb` §1 |
| 2 | **Prompting · RAG · Fine-tuning** — tabla comparativa. Heurística de decisión. Antipattern del fine-tuning. | `01-conceptos.ipynb` §2 |
| 3 | **Costes y casos de uso** — orden de magnitud, dónde cae natural cada patrón. | `01-conceptos.ipynb` §3 |
| 4 | **Embeddings** — qué son, entrenamiento contrastivo, densos vs dispersos, dimensionalidad. | `01-conceptos.ipynb` §4 |
| 5 | **Similitud coseno** — fórmula, interpretación, coseno vs euclidiana, el truco de normalizar. | `01-conceptos.ipynb` §5 |
| 6 | **Anatomía de un RAG + glosario** — ingesta y consulta (diagramas), cinco conceptos clave. | `01-conceptos.ipynb` §6 |
| 7 | **Demo — Setup + corpus + chunking** — venv, deps, corpus `.txt`, función de chunking. | `02-demo-rag.ipynb` §0–1 |
| 8 | **Demo — Embeddings con MiniLM** — cargar modelo, ver vector, embeber corpus. | `02-demo-rag.ipynb` §2 |
| 9 | **Demo — Vector store en SQLite + retrieval** — BLOB, SQL plano, coseno con NumPy, top-K. | `02-demo-rag.ipynb` §3–4 |
| 10 | **Demo — Generación con vs sin RAG** — comparación lado a lado. Bonus: `sqlite-vec` como versión producción. | `02-demo-rag.ipynb` §5–6 |
| 11 | **Chunking y retrieval en producción** — estrategias (recursive, semantic), K, híbrido, reranking, HyDE. | `01-conceptos.ipynb` §7–8 |
| 12 | **Modos de fallo + cuándo NO usar RAG** — fallos típicos y regla mental de decisión. | `01-conceptos.ipynb` §9–10 |
| 13 | **Cierre + preview clase 4** — take-aways y transición a construcción de aplicación. | `01-conceptos.ipynb` |

---

## Setup

El entorno es **compartido entre todas las clases del curso** (venv, `.env` y `requirements.txt` viven en el raíz). Si ya lo preparaste para otra clase, salta a `jupyter lab`.

```bash
# Desde la raíz del curso — una sola vez
cd /path/to/GenAI-architecture
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # y completa DEEPSEEK_API_KEY

# Para esta clase
jupyter lab clase-3/notebook/
```

La primera ejecución de la demo descarga el modelo de embeddings MiniLM (~420 MB) desde HuggingFace a `~/.cache/huggingface/`.

---

## Tres mensajes que deben llevarse

1. **RAG no es magia: es búsqueda semántica + inyección de contexto en el prompt.** Todo lo demás son detalles de ingeniería (chunking, vector store, reranking).
2. **La elección entre prompting, RAG y fine-tuning es arquitectónica, no técnica.** Depende de cuánto cambia el conocimiento, cuánto cuesta cada llamada y qué tipo de tarea resuelves.
3. **Lo que construimos aquí vive en los sistemas reales.** El núcleo de yana-killa-demo es este mismo patrón más retrieval híbrido, reranking y citaciones.

---

## Conexión con otras clases

- **Viene de:** clase 2 (prompts como código, pipelines multi-etapa, output estructurado).
- **Lleva a:** clase 4 (construcción de una aplicación LLM completa: frontend, backend, persistencia, streaming).

---

## Proyecto de referencia

El stack de la demo (SQLite + `sentence-transformers` + LLM agnóstico) es una versión didáctica simplificada del que usa `yana-killa-demo` en producción. Allí se añaden: extensión `sqlite-vec` para búsqueda vectorial nativa, BM25 + RRF para retrieval híbrido, y `pymupdf4llm` para ingesta de PDFs.
