# Caso de estudio · Yana Killa Hidrogeología

> Caso de estudio principal de Clase 4. Léelo con el repo `yana-killa-demo` abierto al lado para localizar cada pieza en su archivo.

---

## 1 · El problema

Un especialista de hidrogeología en una operación minera consulta a diario varios documentos normativos y técnicos para responder preguntas concretas (frecuencia de monitoreo, criterios de diseño, comparaciones entre estándares). El acervo típico:

- **DS-024-EM** (Perú, normativo) y otros decretos peruanos.
- **ICOLD Bulletin 194**, **GISTM**, **Panel Feijao** (estándares internacionales post-Brumadinho).
- ~700 páginas en total, varios PDFs escaneados.

Cada consulta toma 30–90 minutos de búsqueda manual. Multiplicado por 10–15 consultas/semana → 4–8 h/persona/semana de búsqueda.

**Lo que muestra la app**: las mismas consultas respondidas en < 30 s, con cita por página clicable que abre el PDF en el párrafo exacto.

### Por qué es buen caso de estudio

No es un toy project. Tiene todas las decisiones que aparecen al construir una aplicación LLM real:

- Cómo ensamblar **prompt + retrieval + LLM + UI** sin acoplarlos.
- Cómo **abstraer el proveedor** de LLM para no quedar atado a uno.
- Cómo dar feedback **streaming** al usuario.
- Cómo forzar **output estructurado** y sobrevivir a sus malformaciones.
- Cómo prevenir **alucinación** con citas verificables.
- Cómo manejar **modos de fallo** (sin internet, sin LLM).
- Auth, rate limit, CORS — el "borde" que separa demo de piloto.

---

## 2 · La arquitectura

### Vista de alto nivel

```
┌──────────────────────┐         ┌─────────────────────────────────┐         ┌────────────┐
│     Frontend         │   SSE   │         Backend                 │         │   LLM      │
│ (TanStack + React)   │◀───────▶│        (FastAPI)                │────────▶│ (LiteLLM)  │
│                      │  POST   │                                 │ HTTPS   │            │
│  - chat.tsx          │ /chat   │   /api/chat ── retriever ──┐    │         │  Claude    │
│  - pdf-viewer (lazy) │         │                            ▼    │         │  GPT-4o    │
│  - savings widget    │         │                          LLM    │         │  Gemini    │
└──────────────────────┘         │                            │    │         │  Ollama    │
                                 │                            ▼    │         └────────────┘
                                 │                  parser (JSON)  │
                                 │                            │    │
                                 │   SSE: retrieved / token / final│
                                 └─────────────────────────────────┘
                                           │
                                           ▼
                                 ┌────────────────────┐
                                 │    SQLite          │
                                 │  · documents       │
                                 │  · chunks (FTS5)   │
                                 │  · chunks_vec      │   ← sqlite-vec
                                 └────────────────────┘
```

### Flujo end-to-end de una consulta

| # | Paso | Dónde mirar |
|---|---|---|
| 1 | Usuario escribe pregunta y aprieta enter | `web/src/routes/_app.chat.tsx` |
| 2 | Frontend hace `fetch POST /api/chat` con `signal` para poder cancelar | `web/src/lib/api.ts:69-108` |
| 3 | Backend valida token y rate limit | `auth.py`, `rate_limit.py` |
| 4 | Backend ejecuta búsqueda híbrida (BM25 + vector + RRF) | `rag/retriever.py:47-94` |
| 5 | Backend emite primer SSE `event: retrieved` con los 8 chunks | `routes/chat.py:35-37` |
| 6 | Backend arma `messages = [system, user_con_fragmentos]` | `llm/prompts.py` |
| 7 | Backend llama a `litellm.acompletion(stream=True)` | `llm/adapter.py:5-19` |
| 8 | Por cada delta del LLM → SSE `event: token` | `routes/chat.py:46-48` |
| 9 | Frontend acumula tokens y los pinta como markdown en vivo | `web/src/lib/api.ts:96-104` |
| 10 | Backend parsea JSON final tolerando backticks/preámbulo | `llm/citations.py:19-33` |
| 11 | Backend enriquece citas con `doc_title`, `page`, `excerpt` | `routes/chat.py:53-66` |
| 12 | Backend emite SSE `event: final` con respuesta + citas estructuradas | `routes/chat.py:67-74` |
| 13 | Click en chip de cita abre slide-over con react-pdf en la página exacta | `web/src/components/pdf-viewer.tsx` |

---

## 3 · Conceptos aplicados (mapeo a archivos)

### A. Abstracción del proveedor de LLM

| Concepto | Archivo | Qué mostrar |
|---|---|---|
| Adapter agnóstico | `api/app/llm/adapter.py` | Solo 35 líneas. Una sola dependencia: LiteLLM. `stream_completion` acepta cualquier modelo registrado. |
| Selección por env var | `.env.example`, `api/app/config.py` | `LLM_MODEL=claude-sonnet-4-6` vs `ollama/llama-3.3-70b` — mismo código, distinto provider. |
| Lista dinámica para UI | `api/app/routes/llm.py`, `web/src/lib/llm-store.ts` | `GET /api/llm/models` lee `LLM_MODELS` (CSV) y deja al usuario cambiar por sesión. |

**Pregunta para reflexionar**: ¿Qué pasaría si quitamos LiteLLM y usamos el SDK oficial de Anthropic? — el `chat.py` se contamina con detalles de un proveedor; el día que el cliente exige Azure, hay que reescribir.

### B. Streaming SSE con tres eventos

| Evento | Cuándo | Para qué sirve UX |
|---|---|---|
| `retrieved` | Inmediato, antes del LLM | El usuario ve "estoy leyendo X documentos" — feedback temprano |
| `token` | Por cada delta del LLM | Sensación de que la respuesta se escribe sola — reduce ansiedad de espera |
| `final` | Cuando termina | Estructura validada (citas con `doc_id`, `page`, `excerpt`) que la UI puede renderizar |

Mirar **`routes/chat.py:33-74`** completo — son 40 líneas que valen como esqueleto reutilizable.

Cliente equivalente: **`web/src/lib/api.ts:69-108`** — parser de SSE manual sobre `fetch` (no `EventSource`, porque necesitamos `POST` y headers de auth). El truco está en `buf.split("\n\n")` y dejar el último frame en buffer hasta que llegue completo.

### C. Output estructurado + parser tolerante

| Pieza | Archivo | Qué mostrar |
|---|---|---|
| System prompt que fuerza JSON | `llm/prompts.py:4-15` | Esquema explícito + "no agregues texto fuera del JSON". Aun así fallarán algunos modelos. |
| Parser que sobrevive | `llm/citations.py:19-33` | Busca \`\`\`json...\`\`\` con regex; si no, busca el primer `{`. Resiste el caso "claro, aquí tienes:\n```json\n{...}\n```". |
| Manejo del fallo del parser | `routes/chat.py:72-73` | Si el parser explota, se devuelve el texto crudo + `error: parse_failed`. La UI **no se rompe**. |

**Pregunta para reflexionar**: ¿Por qué no usar `response_format=json_object` u OpenAI structured outputs? — porque ata al proveedor. El parser tolerante es el precio del agnosticismo.

### D. Citas verificables (anti-alucinación)

| Pieza | Cómo funciona |
|---|---|
| `[^N]` en el markdown | El LLM debe asociar cada afirmación con un `chunk_id` que **realmente está en el contexto** |
| Enriquecimiento server-side | El backend mapea `chunk_id → doc_title, page` (`routes/chat.py:53-66`). Si el modelo se inventa un `chunk_id`, el server lo deja en blanco — la cita queda visiblemente rota |
| Click en chip → PDF en página exacta | El `excerpt` permite verificación visual instantánea por parte del usuario |

Esto es **prompt engineering + arquitectura combinados**: el prompt obliga el formato, pero el server **valida** que las citas existan. No se confía en el LLM.

### E. Búsqueda híbrida (recap de clase 3 aplicado)

`rag/retriever.py` en 95 líneas:

- **BM25** vía SQLite FTS5 (`unicode61 remove_diacritics 2` para español).
- **Vector** vía `sqlite-vec` con BGE-M3 (1024 dim, multilingüe).
- **RRF** (Reciprocal Rank Fusion, k=60) une ambos rankings sin tunear pesos.

Lo importante: este módulo es **reemplazable**. El `chat.py` solo conoce la firma `hybrid_search(conn, embedder, query, top_k)` → mañana podrías meter Pinecone y nada más cambia.

### F. El "borde" de producción

| Preocupación | Archivo | Patrón |
|---|---|---|
| Auth por token compartido | `api/app/auth.py` | Header / query / cookie. Si `PILOT_TOKEN` está vacío → auth desactivada (modo dev). |
| Rate limit por IP+bucket | `api/app/rate_limit.py` | Sliding window con `deque`. In-memory: simple, suficiente para pilotos. **No** sirve multi-worker. |
| CORS | `api/app/main.py:30-37` | Localhost siempre permitido (regex) + `ALLOWED_ORIGINS` por env. |
| Lifespan check | `api/app/main.py:13-25` | Avisa si el índice está vacío en arranque, en lugar de fallar misteriosamente en la primera query. |

### G. Modos de fallo explícitos

Esto es lo más raro de ver en un repo y por eso vale la pena estudiarlo.

| Plan | Qué falla | Qué se hace |
|---|---|---|
| **A** (default) | Nada | Claude Sonnet 4.6 + retriever local |
| **B** | Sin internet | `LLM_MODEL=ollama/llama-3.3-70b` — el resto sigue 100 % local |
| **C** | LLM completamente caído | UI de `/buscar` sigue devolviendo pasajes con cita usando solo BM25+vector |

**Lección**: una buena app LLM **degrada** en lugar de **caerse**. Ver `DEMO.md:27-35`.

---

## 4 · Recorrido sugerido (orden de archivos)

Para recorrer el repo de "afuera hacia adentro":

1. `README.md` — qué resuelve, las 5 vistas, stack.
2. `DEMO.md` — los 6 beats. Si tienes el sistema corriendo, ejecuta los 3 primeros en vivo.
3. `api/app/main.py` — el ensamblado: routers, lifespan, CORS, login.
4. `api/app/routes/chat.py` — **la pieza central**. 76 líneas que contienen el patrón completo de una app LLM.
5. `api/app/llm/prompts.py` — system prompt + builder. Revisar cada regla.
6. `api/app/llm/adapter.py` — 35 líneas, abstracción total del proveedor.
7. `api/app/llm/citations.py` — parser tolerante. Por qué un `json.loads` directo se rompe en producción.
8. `api/app/rag/retriever.py` — para cerrar el loop con clase 3.
9. `web/src/lib/api.ts:69-108` — cómo se consume el SSE en el cliente.
10. `auth.py` + `rate_limit.py` — el borde de producción.

Después del recorrido, abre el navegador en `/chat` y `/buscar` para ver el resultado en vivo.

---

## 5 · Dónde buscar qué (referencia rápida)

```
yana-killa-demo/
├── README.md                       ← qué resuelve y cómo correrlo
├── DEMO.md                         ← guion de 6 beats con planes B/C
├── api/app/
│   ├── main.py                     ← ensamblado FastAPI (lifespan, CORS, login)
│   ├── auth.py                     ← token compartido (header/query/cookie)
│   ├── rate_limit.py               ← sliding window in-memory por IP
│   ├── config.py                   ← pydantic-settings, lee .env
│   ├── routes/
│   │   ├── chat.py                 ← ★ SSE + retriever + LLM + parser
│   │   ├── ingest.py               ← drag-drop → OCR → chunks → embeddings
│   │   ├── search.py               ← /buscar (modo Plan C)
│   │   ├── documents.py            ← listado y stream de PDFs
│   │   └── llm.py                  ← /llm/models para el selector
│   ├── llm/
│   │   ├── adapter.py              ← ★ LiteLLM (stream + complete)
│   │   ├── prompts.py              ← ★ system prompt + builder
│   │   └── citations.py            ← ★ parser tolerante de JSON
│   ├── rag/
│   │   ├── retriever.py            ← BM25 + vector + RRF
│   │   ├── embedder.py             ← BGE-M3
│   │   ├── chunker.py              ← 800 tokens, 100 overlap, headings
│   │   ├── pdf_to_markdown.py      ← pymupdf4llm + OCR
│   │   └── ingest.py               ← orquestación del pipeline
│   └── db/                         ← schema, models, repository
└── web/src/
    ├── routes/
    │   ├── _app.chat.tsx           ← UI de chat
    │   ├── _app.buscar.tsx         ← UI de búsqueda (Plan C)
    │   └── _app.cargar.tsx         ← drag-and-drop
    ├── lib/
    │   ├── api.ts                  ← ★ chatStream() — parser SSE manual
    │   ├── llm-store.ts            ← Zustand: modelo seleccionado
    │   └── savings-store.ts        ← widget de minutos ahorrados
    └── components/
        └── pdf-viewer.tsx          ← react-pdf con lazy load
```

★ = los 5 archivos clave para entender el patrón completo de la app LLM.
