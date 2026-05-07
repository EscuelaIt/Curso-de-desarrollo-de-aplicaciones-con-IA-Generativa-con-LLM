# Guion de la demo (13–15 min)

## Preparación
- `make seed` para poblar el índice (idempotente — skips si ya hay documentos).
- Abrir http://localhost:5173, verificar Dashboard con 8 docs piloto.
- Ajustar `.env` con `LLM_MODEL=claude-sonnet-4-6` y `ANTHROPIC_API_KEY=...`.
- Tener a la mano 1 PDF de respaldo por si el demo live falla.

## Beat 1 — Setup (60 s)
Dashboard abierto. Mostrar stats (8 documentos, 704 páginas, 4 tipos cubiertos) y widget "Ahorro: 0 min" abajo a la derecha.

## Beat 2 — Consulta simple (2 min)
Click preset **"Frecuencia DS-024"** → respuesta en streaming con cita → click cita → PDF se abre en la página exacta. Observar el ahorro: +30 min.

## Beat 3 — Comparación cruzada (3 min)
Click preset **"Comparar DS-024 vs ICOLD 194"** → respuesta con ambas fuentes citadas. Ahorro: +60 min acumulado.

## Beat 4 — Reporte multi-documento (3 min)
Click preset **"Resumen post-Feijao"** → reporte ejecutivo combinando 3+ fuentes (Panel Feijao, GISTM, ICOLD 194). Ahorro: +90 min acumulado.

## Beat 5 — Ingesta en vivo (3 min)
Ir a `/cargar`, pedirle al equipo del cliente un PDF nuevo. Drag-drop. Esperar "Indexado" (15–90 s según tamaño/OCR). Volver a `/chat`, preguntar sobre ese PDF. Verificar que aparece indexado en `/repositorio`.

## Beat 6 — Cierre (2 min)
Abrir LLMSelector en el top bar, mostrar los modelos configurados (Claude, GPT-4, Gemini, Ollama). Cerrar enfatizando el widget de ahorro acumulado (~3 h en 6 minutos de demo).

## Plan B — Sin internet
Si la conexión falla:
- Cambiar `.env` a `LLM_MODEL=ollama/llama-3.3-70b`
- Ejecutar `ollama serve` local
- Reiniciar `make api`
Las embeddings (BGE-M3) y el retriever corren 100 % locales.

## Plan C — LLM completamente muerto
Demo "modo explorador" en `/buscar` — búsqueda híbrida BM25+vector sigue funcionando sin LLM, devolviendo pasajes relevantes con cita.
