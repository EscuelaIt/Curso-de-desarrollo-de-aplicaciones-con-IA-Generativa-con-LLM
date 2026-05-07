from pathlib import Path
from ..config import settings
from ..deps import db_path, markdown_dir
from ..db.database import init_db, get_connection
from ..db.repository import list_documents
from ..rag.embedder import Embedder
from ..rag.ingest import ingest_pdf

SEED_METADATA = {
    "DS-024-2016-EM.pdf": {"doc_type": "normativa_nacional", "zone": "PE"},
    "DS-024-2016-EM-ANEXOS.pdf": {"doc_type": "normativa_nacional_anexos", "zone": "PE"},
    "Normas_Legales_20231230.pdf": {"doc_type": "normativa_nacional", "zone": "PE"},
    "4990975-anexos.pdf": {"doc_type": "anexos_tecnicos"},
    "global-industry-standard_EN.pdf": {"doc_type": "estandar_internacional"},
    "ICOLDBulletin194-preprint (2).pdf": {"doc_type": "boletin_tecnico"},
    "tailings_conformance-protocols.pdf": {"doc_type": "protocolo"},
    "APEGBC-Legislated-Dam-Safety-Reviews.PDF": {"doc_type": "guia_tecnica"},
}

def run():
    p = db_path()
    init_db(p)
    conn = get_connection(p)
    existing = {d.filename for d in list_documents(conn)}
    embedder = Embedder()
    seed_dir = Path(settings.docs_seed_dir)
    pdfs = sorted(list(seed_dir.glob("*.pdf")) + list(seed_dir.glob("*.PDF")))
    print(f"Found {len(pdfs)} PDFs in {seed_dir}")
    for pdf in pdfs:
        if pdf.name in existing:
            print(f"  skip {pdf.name} (already ingested)")
            continue
        meta = SEED_METADATA.get(pdf.name, {})
        print(f"  ingesting {pdf.name} ...")
        ingest_pdf(
            conn=conn, pdf_path=str(pdf), title=pdf.stem,
            embedder=embedder, markdown_out_dir=markdown_dir(),
            **meta,
        )
    conn.close()
    print("Seed complete.")

if __name__ == "__main__":
    run()
