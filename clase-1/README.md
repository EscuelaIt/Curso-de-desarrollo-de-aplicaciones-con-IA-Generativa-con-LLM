# Clase 1 — Arquitectura IA Generativa y el Ecosistema LLM

> Clase 1 (de 5) del curso *Arquitectura de Aplicaciones con IA Generativa* — EscuelaIT.
> Nivel: desarrolladores intermedio-avanzados.

---

## Qué vas a aprender

Al terminar esta clase deberías ser capaz de:

1. Explicar qué es un LLM / modelo fundacional y cómo se diferencia del ML clásico.
2. Entender tokenización, ventanas de contexto y cómo impactan en coste y calidad.
3. Navegar el ecosistema actual de proveedores (frontier US, frontier chino, open-weights, inferencia especializada).
4. Reconocer cuándo usar un framework (LangChain, LlamaIndex, Vercel AI SDK, MCP) y cuándo NO.
5. Hacer una llamada a chat completions en Python, entendiendo roles, streaming, tool use y structured output.
6. Cambiar de proveedor cambiando únicamente `base_url` (patrón del estándar OpenAI-compatible).

---

## Contenidos

| # | Bloque | Material |
|---|---|---|
| 0 | **Apertura + demo gancho** — el asistente de `peru-elecciones` respondiendo preguntas reales sobre conteo ONPE como ejemplo de "lo que vamos a saber construir". | — |
| 1 | **Fundamentos LLM** — modelo fundacional, Transformer, pre/post-training, capacidades emergentes y límites. Panorama de modelos frontier (Claude 4.x, GPT-5, Gemini 2.x/3, DeepSeek, Llama 4, Qwen, Mistral). Chat vs razonador. | [01-fundamentos.md](contenido/01-fundamentos.md) |
| 2 | **Tokens y contexto** — BPE, tiktoken, SentencePiece. "Language tax". Ventanas 1M+ y límites efectivos (Lost in the Middle, RULER). Prompt caching. | [02-tokens-contexto.md](contenido/02-tokens-contexto.md) |
| 3 | **Ecosistema de proveedores** — mapa de 6 capas: frontier US/CN, open-weights, inferencia (Groq/Cerebras), hyperscalers, self-host. Pricing por tier. Compliance (GDPR, EU AI Act, HIPAA). Criterios de elección. | [03-proveedores.md](contenido/03-proveedores.md) |
| 4 | **APIs de chat completions** — anatomía de `/v1/chat/completions`. El estándar OpenAI-compatible y sus caveats. Anthropic Messages API. Streaming SSE. Tool use. Structured output. Misma llamada a 2 proveedores cambiando solo `base_url`. | [05-apis.md](contenido/05-apis.md) |
| 5 | **Frameworks: cuándo sí, cuándo no** — LangChain/LangGraph, LlamaIndex, Semantic Kernel, Haystack, Pydantic AI, Vercel AI SDK, DSPy. MCP como estándar emergente. Postura del curso: empezar con SDK directo. | [04-frameworks.md](contenido/04-frameworks.md) |
| 6 | **Cierre + preview clase 2** — take-aways y transición a Prompt Engineering. | — |

**Hilo narrativo:** *"De ChatGPT la caja mágica al endpoint HTTP que controlamos"* — cada bloque desmitifica una capa (el modelo → el token → el proveedor → la API → el framework).

---

## Tres mensajes que deben llevarse

1. **El LLM es una capa de infraestructura, no una feature.** La diferenciación vive *alrededor* (prompts, datos, tooling, eval, UX). Justifica el curso entero.
2. **No hay "un mejor modelo".** Hay uno mejor para *tu* tarea, precio y latencia. Habilidad clave: saber elegir y saber cambiar.
3. **Las limitaciones del modelo son la razón del resto del curso.** RAG, tool use, memoria, orquestación, evaluación son respuestas arquitectónicas a fallos conocidos.

---

## Material de la clase

- **Presentación**: `slides/main.tex` (Beamer + metropolis, compilable con `make pdf`).
- **Dossiers**: `contenido/*.md` con investigación detallada por bloque (cada uno trae sus propias fuentes al final).
- **Referencias bibliográficas**: [referencias.md](referencias.md).

---

## Proyectos de referencia

- **`peru-elecciones`** — Go + DeepSeek vía API OpenAI-compatible, contexto SQLite sin RAG. Caso "minimal viable LLM app". Sirve como demo gancho de apertura.
- **`yana-killa-demo`** — FastAPI + TanStack Start, RAG híbrido BM25+vector, LiteLLM, SSE, citas verificables. Caso de estudio de Clase 4.
