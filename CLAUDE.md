# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains course materials for "Arquitectura de Aplicaciones con IA Generativa" — a 5-session course (90 min each) on building production-ready applications with LLMs. The course is being developed for EscuelaIT.

## Course Structure

- **Clase 1**: Fundamentos de IA Generativa y Ecosistema LLM
- **Clase 2**: Prompt Engineering como Sistema
- **Clase 3**: RAG — *retrieval augmented generation* (embeddings, similitud coseno, vector stores, chunking, modos de fallo)
- **Clase 4**: Construcción de Aplicaciones LLM
- **Clase 5**: Despliegue y Producción

## Related Projects

- `/Users/manduinca/Projects/deepskill/educa-AI-Platforms` — Reference project (EdTech platform with LLM orchestration, multi-turn chat, streaming, exports, rate limiting). Concepts from this project inform the practical sessions of the course.
- `/Users/manduinca/Projects/deepskill/peru-elecciones` — Reference project (Go + DeepSeek vía OpenAI-compatible API, SQLite context injection, no RAG). Demo gancho de Clase 1 y fuente de ejemplos mínimos de cliente LLM agnóstico.
- `yana-killa-demo/` (en este repo) — Reference project (FastAPI + TanStack Start, RAG híbrido BM25+vector, LiteLLM, SSE, citas verificables). Case study principal de Clase 4 y stack base de Clase 5. Versión anonimizada del proyecto comercial original — ver § Anonimización para reglas si lo modificas.

## Language

All course content is written in Spanish.

## Slides format

- **Stack**: Beamer + `metropolis` theme + `xelatex` + `listings` (aspectratio 16:9).
- **Location**: `clase-N/slides/main.tex`.
- **Build**: `cd clase-N/slides && make pdf` (o `make watch` con `latexmk` para recompilación continua).

## Teaching posture

Amplitud sobre profundidad: el curso enseña conceptos arquitectónicos portables. Las tecnologías concretas se citan, comparan y ejemplifican, pero no se profundiza en el uso específico de ninguna — las diferencias entre implementaciones son menores; lo importante es el concepto detrás.

## Class folder layout

Cada clase se organiza así:

```
clase-N/
├── README.md              # índice y estructura 90 min
├── clase-N-completa.md    # guion maestro (opcional)
├── contenido/             # dossiers de investigación por bloque (opcional)
├── slides/                # Beamer (opcional, ver § Slides format)
├── notebook/              # Jupyter práctico (opcional, ver § Notebook format)
└── referencias.md         # bibliografía de la clase
```

## Notebook format

Para clases prácticas con demos en vivo ejecutadas por el instructor:

- **Ubicación de los notebooks**: `clase-N/notebook/` (p. ej. `prompting.ipynb`, `01-conceptos.ipynb`).
- **Stack**: `openai` SDK apuntando a `api.deepseek.com` (patrón OpenAI-compatible).
- **Infra compartida entre clases (en el raíz del curso)**: `requirements.txt` (unión de deps), `.env` (credenciales), `.venv/` (único entorno para todas las clases). `python-dotenv` busca `.env` hacia arriba, así que los notebooks funcionan sin cambios.
- **Credenciales**: `.env` en gitignore, `.env.example` versionado. La `DEEPSEEK_API_KEY` puede reutilizarse de `peru-elecciones/.env`.

## Volatile data

Model names, versions, prices, context windows and benchmark rankings change every 6-8 weeks. Any slide or document citing these must be reverified against official release notes (docs.anthropic.com, platform.openai.com, artificialanalysis.ai, lmarena.ai) on the day of the class.

## Anonimización

En materiales del curso (notebooks, walkthroughs, slides, README) reemplazar:

- `Antapaccay` → `Yana Killa` (cliente)
- `antapaccay-demo` → `yana-killa-demo` (nombre del proyecto de referencia)

No incluir rutas absolutas al repo real. La carpeta en disco mantiene su nombre original; la sustitución es solo en materiales publicables.
