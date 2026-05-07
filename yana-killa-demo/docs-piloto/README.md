# Corpus piloto

Este directorio aloja los PDFs normativos sobre los que el demo hace RAG.

**No se incluyen los PDFs en este repo** — son normativa pública pero ocupan ~13 MB y la selección concreta es del cliente del piloto. Para reproducir el demo, deja aquí PDFs propios que cubran el dominio que te interese (relaves mineros, normativa peruana, estándares internacionales).

Cuando hayas dejado los PDFs en este directorio, ejecuta `make seed` desde la raíz del proyecto para generar el índice (`data/index.sqlite`).

Documentos sugeridos para reproducir el corpus original:

- DS-024-2016-EM y sus anexos (normativa minera peruana, MINEM)
- ICOLD Bulletin 194 (estándares internacionales de presas de relaves)
- Global Industry Standard on Tailings Management (GISTM)
- Panel Feijao expert report
- APEGBC Legislated Dam Safety Reviews
- Tailings conformance protocols (Mining Association of Canada)
