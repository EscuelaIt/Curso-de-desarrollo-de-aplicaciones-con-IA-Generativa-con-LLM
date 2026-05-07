# Clase 2 — Prompt Engineering como sistema

> Clase 2 (de 5) del curso *Arquitectura de Aplicaciones con IA Generativa* — EscuelaIT.
> Nivel: desarrolladores intermedio-avanzados.

---

## Qué vas a aprender

Al terminar esta clase deberías ser capaz de:

1. Distinguir zero-shot, few-shot, chain-of-thought y self-consistency, y saber cuándo usar cada una.
2. Diseñar un system prompt con estructura (rol, contexto, restricciones, formato) y defender por qué cada bloque reduce errores.
3. Forzar output estructurado con JSON mode, Pydantic + Instructor, y manejar validación + truncamiento.
4. Orquestar un pipeline multi-etapa donde cada llamada LLM es una función testeable y versionable.

---

## Contenidos

| # | Bloque | Material |
|---|---|---|
| 1 | **Setup + anatomía rápida** — `.env`, cliente DeepSeek, test de conexión, roles y temperature. | `notebook/prompting.ipynb` §0–1 |
| 2 | **Técnicas de prompting** — zero-shot, few-shot, CoT, self-consistency con ejemplos electorales. | `notebook/prompting.ipynb` §2 |
| 3 | **System prompts como arquitectura** — rol · contexto · restricciones · formato. Antes/después. | `notebook/prompting.ipynb` §3 |
| 4 | **Output estructurado** — JSON mode, Pydantic + Instructor, validación con retry, truncamiento. | `notebook/prompting.ipynb` §4 |
| 5 | **Pipeline multi-etapa** — extracción → clasificación → informe. Cada etapa es un LLM call tipado. | `notebook/prompting.ipynb` §5 |
| 6 | **Puente al código Go de `peru-elecciones`** — mapeo de los patrones del notebook al código real: cliente agnóstico, template de prompt, inyección de contexto SQLite. | proyecto `peru-elecciones` |
| 7 | **Cierre + preview clase 3** — take-aways y transición a RAG y orquestación. | — |

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
jupyter lab clase-2/notebook/prompting.ipynb
```

---

## Tres mensajes que deben llevarse

1. **Los prompts son código.** Versionados, testeables, iterados con datos — no arte oculto en un string.
2. **El system prompt bien estructurado reduce más alucinaciones que `temperature=0`.** Rol, contexto, restricciones y formato son contratos explícitos.
3. **Structured output + validación es la frontera entre demo y producto.** JSON mode abre la puerta; Pydantic + Instructor la cierra con retry.

---

## Conexión con otras clases

- **Viene de:** clase 1 (anatomía API, roles, OpenAI-compatible, DeepSeek como proveedor).
- **Lleva a:** clase 3 (cuando el pipeline deja de ser lineal: ramas, memoria, RAG, orquestación tipo grafo).
