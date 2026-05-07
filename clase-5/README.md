# Clase 5 — Despliegue y Producción

> Clase 5 (de 5) del curso *Arquitectura de Aplicaciones con IA Generativa* — EscuelaIT.
> Nivel: desarrolladores intermedio-avanzados.

---

## Qué vas a aprender

Al terminar esta clase deberías ser capaz de:

1. Justificar las decisiones de **infraestructura** detrás de una app LLM real (cómputo, red, dominio, TLS, despliegue, secretos) y descartar alternativas con criterio.
2. Leer y modificar el stack `Dockerfile + docker-compose + nginx` de una aplicación LLM con streaming SSE, sin romper el flujo del usuario.
3. Provisionar y desplegar end-to-end en AWS con scripts reproducibles (`setup → deploy → teardown`), entendiendo cada recurso AWS elegido y por qué.
4. Distinguir **observabilidad** mínima viable (latencia + health) de la observabilidad LLM real (tokens, coste, traces) y reconocer qué falta cuando solo tienes la primera.

---

## Contenidos

| # | Bloque | Material |
|---|---|---|
| 1 | **Apertura + recap clases 1-4** — dónde encaja "producción" en el stack ya construido. Hilo narrativo: *de demo que corre a sistema que se opera*. | — |
| 2 | **Walkthrough de infra real** — tour comentado del repo `yana-killa-demo`: AWS (EC2, gp3, SG, Cloudflare), Docker (api, web, nginx), nginx para SSE, deploy via rsync, secretos, swap, AMI. | `contenido/infra-walkthrough.md` + repo del demo |
| 3 | **Lo que la infra NO cubre** — mapa de brechas: observabilidad LLM (tokens/coste/trace), guardrails, evaluación. Por qué `latency_ms` no es observabilidad. | — |
| 4 | **Cierre del curso** — take-aways acumulados de las 5 clases. Qué leer y practicar después. | — |

---

## Caso de estudio

El bloque 2 se apoya íntegramente en la infraestructura real del proyecto `yana-killa-demo` ya presentado en clase 4. La guía conceptual `contenido/infra-walkthrough.md` explica primero **el porqué** de cada decisión; recién después se mira el código. El objetivo es que cuando se abra `infra/setup-prod.sh` ya sepas qué vas a ver y por qué.

---

## Dos mensajes que deben llevarse

1. **Producción es decisiones, no plantillas.** Cada elección de infra (t3.medium, gp3, Cloudflare proxied, deploy por rsync) responde a un tradeoff explícito. Si no sabes el porqué, no sabes cuándo cambiar.
2. **Observabilidad de una app LLM no es solo `latency_ms` y `/health`.** Tokens, coste, trace por request y eval continua son la diferencia entre saber y suponer. Lo que no mides no mejora.

---

## Conexión con otras clases

- **Viene de:** clase 4 (la app `yana-killa-demo` ya construida — auth, rate limit, modos de fallo Plan A/B/C, streaming SSE, citas verificables).
- **Cierra el curso:** la clase 5 contesta el "y ahora cómo se opera esto" que la clase 4 dejó abierto.

---

## Tres ideas clave del curso completo

1. **El LLM es infraestructura, no feature.** La diferenciación vive alrededor (clase 1).
2. **Prompt + estructura + retrieval son código versionable.** No arte oculto en strings (clases 2-3).
3. **Lo que separa demo de producto es el borde y la medida.** Streaming, citas, modos de fallo y observabilidad (clases 4-5).
