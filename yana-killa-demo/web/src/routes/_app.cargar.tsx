import { createFileRoute } from "@tanstack/react-router";
import { useDropzone } from "react-dropzone";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthError, getDocument, ingestFile, listDocuments } from "@/lib/api";
import { toast } from "@/lib/toast-store";
import { UploadCloud, CheckCircle2, Loader2 } from "lucide-react";

type Job = { name: string; status: "uploading" | "processing" | "done" | "error"; docId?: string; error?: string };

async function pollUntilDone(docId: string, onTick: () => void): Promise<"approved" | "failed"> {
  const start = Date.now();
  const MAX_MS = 30 * 60 * 1000;
  while (Date.now() - start < MAX_MS) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const doc = await getDocument(docId);
      if (doc.status === "approved") return "approved";
      if (doc.status === "failed") return "failed";
      onTick();
    } catch {
      // 404 transitorio (placeholder borrado, doc final aun no insertado): seguimos.
    }
  }
  return "failed";
}

const DOC_TYPES: { value: string; label: string }[] = [
  { value: "", label: "(Sin clasificar)" },
  { value: "normativa_nacional", label: "Normativa nacional" },
  { value: "normativa_nacional_anexos", label: "Anexos de normativa nacional" },
  { value: "anexos_tecnicos", label: "Anexos técnicos" },
  { value: "estandar_internacional", label: "Estándar internacional" },
  { value: "boletin_tecnico", label: "Boletín técnico" },
  { value: "protocolo", label: "Protocolo" },
  { value: "guia_tecnica", label: "Guía técnica" },
];

const ZONES: { value: string; label: string }[] = [
  { value: "", label: "(Sin zona)" },
  { value: "PE", label: "Perú" },
  { value: "INT", label: "Internacional" },
];

function Cargar() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [docType, setDocType] = useState("");
  const [zone, setZone] = useState("");
  const qc = useQueryClient();
  const polledRef = useRef<Set<string>>(new Set());

  // Al montar la vista (o al regresar a ella), recoge los docs que estan en
  // 'processing' en el server y los re-engancha al UI con polling activo.
  // Asi el usuario que sale a /chat o /repositorio vuelve y sigue viendo el progreso.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const docs = await listDocuments();
        const inflight = docs.filter((d) => d.status === "processing");
        if (cancelled || inflight.length === 0) return;
        setJobs((j) => {
          const known = new Set(j.map((x) => x.docId).filter(Boolean));
          const fresh = inflight.filter((d) => !known.has(d.id));
          return [
            ...fresh.map<Job>((d) => ({ name: d.filename, status: "processing", docId: d.id })),
            ...j,
          ];
        });
        for (const d of inflight) {
          if (polledRef.current.has(d.id)) continue;
          polledRef.current.add(d.id);
          pollUntilDone(d.id, () => qc.invalidateQueries({ queryKey: ["documents"] })).then((final) => {
            if (cancelled) return;
            if (final === "approved") {
              setJobs((j) => j.map((x) => x.docId === d.id ? { ...x, status: "done" } : x));
            } else {
              setJobs((j) => j.map((x) => x.docId === d.id ? { ...x, status: "error", error: "OCR/embedding falló en el servidor" } : x));
            }
            qc.invalidateQueries({ queryKey: ["documents"] });
          });
        }
      } catch {
        // Sin token, sin red, etc. — el guard global ya redirige a /login si hace falta.
      }
    })();
    return () => { cancelled = true; };
  }, [qc]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf", ".PDF"] },
    onDrop: async (files) => {
      for (const f of files) {
        const job: Job = { name: f.name, status: "uploading" };
        setJobs((j) => [job, ...j]);
        try {
          const r = await ingestFile(f, docType, zone);
          if (r.status === "approved") {
            setJobs((j) => j.map((x) => x.name === f.name ? { ...x, status: "done", docId: r.doc_id } : x));
            qc.invalidateQueries({ queryKey: ["documents"] });
            continue;
          }
          // status === "processing" — el server lo procesa en background. Polleamos.
          setJobs((j) => j.map((x) => x.name === f.name ? { ...x, status: "processing", docId: r.doc_id } : x));
          qc.invalidateQueries({ queryKey: ["documents"] });
          polledRef.current.add(r.doc_id);
          const final = await pollUntilDone(r.doc_id, () => {
            qc.invalidateQueries({ queryKey: ["documents"] });
          });
          if (final === "approved") {
            setJobs((j) => j.map((x) => x.name === f.name ? { ...x, status: "done", docId: r.doc_id } : x));
            qc.invalidateQueries({ queryKey: ["documents"] });
          } else {
            setJobs((j) => j.map((x) => x.name === f.name ? { ...x, status: "error", error: "OCR/embedding falló en el servidor" } : x));
            toast.error(`No se pudo indexar ${f.name}`);
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          setJobs((j) => j.map((x) => x.name === f.name ? { ...x, status: "error", error: msg } : x));
          if (!(e instanceof AuthError)) toast.error(`No se pudo indexar ${f.name}: ${msg}`);
        }
      }
    },
  });

  return (
    <div className="p-8 max-w-[820px]">
      <div className="mb-6">
        <h1 className="font-display text-2xl">Cargar documentos</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Arrastra PDFs aquí. OCR, chunking, embeddings e indexado en infra dedicada — los PDFs no salen del entorno del piloto.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <label className="text-xs">
          <span className="block mb-1 text-[var(--color-text-muted)]">Tipo de documento</span>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm bg-transparent"
          >
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="block mb-1 text-[var(--color-text-muted)]">Zona</span>
          <select
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm bg-transparent"
          >
            {ZONES.map((z) => (
              <option key={z.value} value={z.value}>{z.label}</option>
            ))}
          </select>
        </label>
      </div>
      <div {...getRootProps()}
        className={`border-2 border-dashed rounded p-12 text-center transition-colors ${
          isDragActive ? "bg-[var(--color-surface)] border-[var(--color-accent)]" : "border-[var(--color-border)]"
        }`}>
        <input {...getInputProps()} />
        <UploadCloud className="mx-auto h-8 w-8 mb-3 text-[var(--color-text-muted)]" />
        <div className="text-sm">
          {isDragActive ? "Suelta el archivo para procesar" : "Arrastra uno o más PDFs, o haz clic para seleccionar"}
        </div>
      </div>
      {jobs.length > 0 && (
        <ul className="mt-6 border rounded divide-y">
          {jobs.map((j, i) => (
            <li key={i} className="p-3 flex items-center justify-between text-sm">
              <span className="font-mono text-xs">{j.name}</span>
              <span className="flex items-center gap-2 text-xs">
                {j.status === "uploading" && <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo…</>}
                {j.status === "processing" && <><Loader2 className="h-4 w-4 animate-spin" /> OCR + indexando (puede tomar varios minutos)…</>}
                {j.status === "done" && <><CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" /> Indexado</>}
                {j.status === "error" && <span className="text-[var(--color-error)]">Error: {j.error}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_app/cargar")({ component: Cargar });
