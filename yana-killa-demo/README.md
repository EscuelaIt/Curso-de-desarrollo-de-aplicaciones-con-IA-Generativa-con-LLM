# Yana Killa · Hidrogeología — Demo MVP

> **Chatbot con citas exactas sobre normativa minera peruana y estándares internacionales de presas de relaves. 100 % local-first. LLM-agnóstico.**
>
> Demo piloto **Yana Killa**. En lugar de buscar un dato en 700 páginas de PDFs normativos, el equipo de Hidrogeología lo pregunta en lenguaje natural y recibe respuesta en segundos — con cita por página que abre el PDF en el párrafo exacto.

---

## ¿Qué resuelve?

Un especialista de hidrogeología pierde **30–90 minutos por consulta** buscando requisitos en el DS-024, ICOLD Bulletin 194, GISTM, Panel Feijao, etc. Multiplicado por 10–15 consultas por semana, son **4–8 horas/semana por persona** quemadas en búsqueda manual. Esta demo muestra el caso extremo: las mismas consultas, respondidas con cita en **< 30 segundos**.

**Tres capacidades clave:**

1. **Q&A con citas** — "¿Qué dice el DS-024 sobre frecuencia de monitoreo?" → respuesta con chip `📄 DS-024-EM · p.47` que abre el PDF en esa página.
2. **Comparación cruzada** — "Compara DS-024 vs ICOLD 194 en monitoreo piezométrico" → tabla de brechas con fuentes dobles.
3. **Reporte multi-documento** — "Resumen post-Feijao para el directorio" → síntesis ejecutiva combinando Panel Feijao, GISTM, ICOLD 194.

**Widget de ahorro acumulado** en la esquina inferior derecha traduce cada consulta en minutos-persona ahorrados (simple = 30 min, comparación = 60 min, reporte = 90 min) — el caso de negocio se construye solo durante la demo.

---

## ¿Qué hace diferente?

| Feature | Esta demo | Alternativa típica |
|---|---|---|
| **Ejecución** | 100 % local (embeddings, retriever, DB, fonts, PDF viewer) | SaaS en la nube |
| **LLM** | Pluggable vía env var (Claude / GPT-4 / Gemini / Ollama) | Atado a un proveedor |
| **Citas** | Estructuradas `[^N]` → JSON validado → chip clickeable → PDF en la página exacta | Texto libre sin verificación |
| **Búsqueda** | Híbrida BM25 + vector con Reciprocal Rank Fusion | Solo vector (pierde matches literales como "DS-024") |
| **Ingesta** | Drag-and-drop en la UI, OCR automático | CLI, pipeline separado |
| **Tiempo a la primera respuesta** | ~10 s después de `make seed` | Días de onboarding con un vendor |

---

## Quick start

```bash
git clone <repo-url> yana-killa-demo
cd yana-killa-demo
cp .env.example .env                # edita ANTHROPIC_API_KEY (u otro provider)
make dev                            # api :8000  +  web :5173
```

En otra terminal (solo la primera vez):

```bash
make seed                           # indexa los PDFs en docs-piloto/ (~40 min con OCR)
```

Abrir **http://localhost:5173**.

> **Corpus**: este repo no incluye los PDFs originales (eran selección del cliente del piloto). Coloca tus propios PDFs normativos en `docs-piloto/` antes de correr `make seed`. Ver [`docs-piloto/README.md`](./docs-piloto/README.md) para sugerencias de documentos públicos que reproducen el corpus original.

---

## Cómo correr la demo (guion 13–15 min)

El guion completo está en [`DEMO.md`](./DEMO.md). Resumen:

### Preparación
- [ ] `make seed` terminó (Dashboard muestra **8 documentos, 704 páginas**)
- [ ] `.env` con `LLM_MODEL=deepseek/deepseek-chat` y `DEEPSEEK_API_KEY` válido
- [ ] Ping de latencia al provider (`curl -s https://api.deepseek.com`) < 200 ms
- [ ] 1 PDF de respaldo para el Beat 5 (por si la conexión de la sala falla durante drag-drop)

### Los 6 beats

| # | Beat | Tiempo | Acción | Ahorro |
|---|---|---|---|---|
| 1 | **Setup** | 60 s | Dashboard abierto. Mostrar stats y widget "Ahorro: 0 min" | 0 |
| 2 | **Consulta simple** | 2 min | Preset **"Frecuencia DS-024"** → ver streaming → click chip → PDF se abre en la página | +30 min |
| 3 | **Comparación cruzada** | 3 min | Preset **"Comparar DS-024 vs ICOLD 194"** → respuesta con fuentes dobles | +60 min |
| 4 | **Reporte multi-doc** | 3 min | Preset **"Resumen post-Feijao"** → síntesis ejecutiva con 3+ fuentes | +90 min |
| 5 | **Ingesta en vivo** | 3 min | Pedir un PDF al cliente. `/cargar` → drag-drop → esperar "Indexado" → ir a `/chat`, preguntar sobre ese PDF | — |
| 6 | **Cierre** | 2 min | Abrir LLMSelector, mostrar los providers configurables. Enfatizar el widget de ahorro (~3 h en 6 min de demo) | — |

### Planes de contingencia

**Plan B — Internet restringido (frecuente en plantas mineras):**
```
LLM_MODEL=ollama/llama-3.3-70b
```
Más `ollama serve` corriendo local. Embeddings (BGE-M3) y retriever ya son 100 % locales — solo falta el LLM.

**Plan C — LLM muerto por completo:**
Demo en **modo explorador** por `/buscar`. La búsqueda híbrida BM25+vector sigue devolviendo pasajes relevantes con cita, sin necesidad de LLM. Menos espectacular pero sigue siendo útil.

---

## Las 5 vistas

| Ruta | Para qué | Lo interesante |
|---|---|---|
| `/` | **Dashboard** | Stats del acervo, últimos indexados |
| `/repositorio` | **Repositorio documental** | Tabla con filtros por tipo; click para ver el PDF entero |
| `/chat` | **Asistente** | Streaming SSE + citation chips clickeables + slide-over PDF |
| `/buscar` | **Búsqueda semántica** | BM25 + vector + RRF; resultados llevan directo al PDF |
| `/cargar` | **Cargar documentos** | Drag-and-drop de PDFs → OCR → chunks → embeddings → índice, todo local |
| `/documentos/:id` | **Vista documento** | Visor react-pdf con metadatos |

---

## Stack

**Frontend:** TanStack Start v1 + React 19 + Tailwind v4 + shadcn/ui + TanStack Query + react-pdf + react-dropzone. SSR con lazy load del visor PDF para mantener el bundle cliente delgado. Fuentes self-hosted (`@fontsource`) — sin dependencias CDN.

**Backend:** FastAPI + pydantic-settings + uv. Python 3.12/3.13.

**RAG pipeline:**
1. **PDF → Markdown** con [`pymupdf4llm`](https://pypi.org/project/pymupdf4llm/) (preserva headings, tablas, layout; OCR cuando hace falta).
2. **Chunker** con detección de headings sobre texto original (antes del word-split) — 800 tokens por chunk, 100 de overlap.
3. **Embeddings** con [`BAAI/bge-m3`](https://huggingface.co/BAAI/bge-m3) (1024 dim, multilingüe ES/EN, CPU).
4. **Storage** en SQLite con [`sqlite-vec`](https://github.com/asg017/sqlite-vec) (vector) + FTS5 (léxico, `unicode61 remove_diacritics 2`).
5. **Retriever híbrido** — BM25 + vector en paralelo, fusión por Reciprocal Rank Fusion (k=60), top_k=8 de 20 candidatos.
6. **LLM** vía [`LiteLLM`](https://github.com/BerriAI/litellm) — streaming SSE al frontend con 3 eventos: `retrieved`, `token`, `final`. Respuesta estructurada JSON con `answer_markdown` (con marcadores `[^N]`) + `citations[]`.

**Ops:** Docker Compose + Makefile + seed script idempotente. Lifespan hook avisa cuando el índice está vacío.

---

## Cambiar proveedor de LLM

Editar `.env` y reiniciar `make dev`:

```bash
# DeepSeek (default)
LLM_MODEL=deepseek/deepseek-chat
DEEPSEEK_API_KEY=sk-...

# DeepSeek con razonamiento (R1)
LLM_MODEL=deepseek/deepseek-reasoner
DEEPSEEK_API_KEY=sk-...

# Claude
LLM_MODEL=claude-sonnet-4-6
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI / Azure
LLM_MODEL=azure/gpt-4o
AZURE_API_KEY=...
AZURE_API_BASE=https://your-resource.openai.azure.com

# Gemini
LLM_MODEL=gemini/gemini-2.5-pro
GEMINI_API_KEY=...

# Ollama local (sin internet)
LLM_MODEL=ollama/llama-3.3-70b
```

El `LLMSelector` del top bar lista los modelos disponibles (configurables vía `LLM_MODELS` en `.env`) y permite cambiar por sesión sin reiniciar.

---

## Comandos

| Comando | Qué hace |
|---|---|
| `make dev` | api (8000) + web (5173) en paralelo |
| `make api` | solo backend |
| `make web` | solo frontend |
| `make seed` | indexa los 8 PDFs de `docs-piloto/` (idempotente) |
| `make test` | pytest del backend (18 tests) |
| `make reset` | borra `data/` (SQLite + cache markdown) |
| `make build` | construye imagen Docker |
| `cd web && pnpm e2e` | Playwright smoke tests (requiere api+web corriendo) |

---

## Estructura del repo

```
.
├── api/                              # FastAPI backend
│   ├── app/
│   │   ├── main.py                   # FastAPI app + lifespan hook
│   │   ├── config.py                 # pydantic Settings (env)
│   │   ├── deps.py                   # get_db, get_embedder, paths
│   │   ├── db/                       # schema.sql, models, repository
│   │   ├── rag/                      # pdf_to_markdown, chunker, embedder, ingest, retriever
│   │   ├── llm/                      # adapter (LiteLLM), prompts, citations
│   │   ├── routes/                   # ingest, documents, search, chat (SSE), llm
│   │   └── scripts/seed.py           # seed los 8 PDFs piloto
│   └── tests/                        # pytest
├── web/                              # TanStack Start frontend
│   ├── src/
│   │   ├── routes/                   # _app.{chat,buscar,cargar,repositorio,documentos.$docId}.tsx
│   │   ├── components/               # app-shell, nav-rail, pdf-viewer (lazy), …
│   │   └── lib/                      # api.ts, types.ts, stores, query
│   └── e2e/                          # Playwright smoke tests
├── data/                             # runtime SQLite + PDFs + markdown (gitignored)
├── docs-piloto/                      # PDFs normativos seed (no incluidos: ver § Corpus)
├── docker-compose.yml
├── Makefile
├── DEMO.md                           # guion de demo 13–15 min
└── README.md
```

---

## Troubleshooting

**OCR lento la primera vez que corres `make seed`**
Esperado. pymupdf4llm ejecuta tesseract vía pdf2image para los PDFs escaneados. DS-024 toma ~10 min; `global-industry-standard_EN.pdf` puede llegar a 15+ min. Las siguientes corridas son instantáneas (cache markdown en `data/markdown/`).

**CORS error en el navegador**
El backend acepta cualquier `http://localhost:*`. Si ves CORS error, es que el backend no está arriba — verifica con `curl http://localhost:8000/health`.

**Puerto 5173 ocupado → vite se va a 5174**
El backend permite cualquier puerto localhost, así que no hay problema. Solo asegúrate de abrir la URL correcta que imprime vite.

**PDF no se renderiza**
El worker de pdfjs está bundled localmente (`pdfjs-dist` como dep directa + Vite `?url`). Si falla, `pnpm install` en `web/` lo reinstala.

**"Index is empty" al arrancar la API**
Ejecutar `make seed`. El lifespan hook solo imprime un aviso — no crashea.

**Respuesta del LLM vacía o malformada**
Verifica `.env`: `LLM_MODEL` y la API key del provider. El adapter de LiteLLM tolera JSON con backticks; si usas modelos pequeños, upgradea a uno con mejor adherencia al formato.

**DOMMatrix is not defined durante `pnpm dev`**
Ya resuelto — el visor PDF se carga con `React.lazy` para que pdfjs no se evalúe en SSR. Si vuelve a aparecer, es que algún archivo nuevo hizo `import "react-pdf"` a nivel módulo — muévelo a `pdf-viewer.tsx` o envuelve con `lazy()`.

---

## Despliegue como piloto remoto

El demo puede exponerse a un cliente tras una sesión presencial. Cambios clave respecto al modo local:

1. **Auth por token compartido.** Definir en `.env`:

   ```bash
   PILOT_TOKEN=$(python -c "import secrets; print(secrets.token_urlsafe(24))")
   ALLOWED_ORIGINS=https://yanakilla.demo.deepskill.space
   ```

   Con `PILOT_TOKEN` seteado, todas las rutas de `/api/*` (excepto `/health`
   y `/api/auth/login`) exigen header `X-Pilot-Token` o cookie.
   El frontend pide el token en `/login` y lo guarda en `localStorage`.
   Si está vacío, la auth queda desactivada (modo dev).

2. **Rate limit y tamaño máximo.** `RATE_LIMIT_CHAT_PER_HOUR`,
   `RATE_LIMIT_INGEST_PER_HOUR` y `MAX_UPLOAD_MB` controlan el gasto
   de tokens y el disco. Defaults razonables en `.env.example`.

3. **CORS.** Además de `localhost:*` (siempre permitido), se añaden
   los orígenes listados en `ALLOWED_ORIGINS` (CSV).

4. **Workspace compartido.** No hay aislamiento por usuario: todos los
   stakeholders del cliente ven el mismo corpus y los PDFs que alguno
   suba quedan indexados para todos. Es intencional — el objetivo es
   mostrar el caso de uso real del equipo.

5. **Despliegue en AWS.** El stack `infra/` arma una EC2 t3.medium detrás
   de Cloudflare proxied (sin EIP, sin RDS, sin S3):

   ```bash
   cp infra/config.env.example infra/config.env  # ajusta PROD_FQDN
   ./infra/setup-prod.sh                          # crea SG, key, EC2 con Docker + swap
   # Configurar Cloudflare DNS A → IP que imprime el script (Proxied)
   make seed                                      # genera ./data/ con embeddings (40 min)
   # Editar .env con DEEPSEEK_API_KEY, PILOT_TOKEN, ALLOWED_ORIGINS=https://<tu-dominio>
   ./infra/deploy.sh                              # rsync + docker compose up
   curl https://<tu-dominio>/health
   ```

   Para apagar todo: `./infra/teardown-prod.sh` (conserva el EBS).

**Checklist antes de enviar el link al cliente:**

- [ ] `PILOT_TOKEN` configurado, compartido con el cliente por canal seguro
- [ ] `DEEPSEEK_API_KEY` válido y con presupuesto suficiente para ~14 días
- [ ] `make seed` completado (Dashboard muestra 8 documentos, 704 páginas)
- [ ] 1 consulta de prueba por `/chat` con cita clicable → PDF abre OK
- [ ] Drag-drop de un PDF de prueba en `/cargar` → indexa OK
- [ ] HTTPS activo en el dominio expuesto
- [ ] Recordar revocar el token al cerrar el piloto (`PILOT_TOKEN=` → reinicio)

## Licencia

MIT — ver [`LICENSE`](./LICENSE).
