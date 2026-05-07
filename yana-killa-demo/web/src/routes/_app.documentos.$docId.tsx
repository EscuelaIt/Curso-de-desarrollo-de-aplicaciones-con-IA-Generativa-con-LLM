import { createFileRoute } from "@tanstack/react-router";
import { pdfFileDescriptor } from "@/lib/api";
import { authHeaders } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useMemo, useState } from "react";

const PdfViewer = lazy(() => import("@/components/pdf-viewer"));

async function fetchDoc(docId: string) {
  const base = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
  const r = await fetch(`${base}/api/documents/${docId}`, { headers: authHeaders() });
  if (!r.ok) throw new Error("not found");
  return r.json();
}

function DocView() {
  const { docId } = Route.useParams();
  const { data } = useQuery({ queryKey: ["doc", docId], queryFn: () => fetchDoc(docId) });
  const [numPages, setNumPages] = useState(0);
  const file = useMemo(() => pdfFileDescriptor(docId), [docId]);

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto bg-[var(--color-surface)] p-6">
        <Suspense fallback={<div className="text-sm text-[var(--color-text-muted)]">Cargando visor PDF…</div>}>
          <PdfViewer
            file={file}
            onLoadSuccess={(p) => setNumPages(p.numPages)}
            renderAllPages={numPages}
          />
        </Suspense>
      </div>
      <aside className="w-80 border-l p-4 text-sm">
        <h2 className="font-display text-lg mb-3">{data?.title}</h2>
        <dl className="space-y-2 text-xs">
          <div><dt className="text-[var(--color-text-muted)]">Archivo</dt><dd className="font-mono">{data?.filename}</dd></div>
          <div><dt className="text-[var(--color-text-muted)]">Páginas</dt><dd className="font-mono">{data?.page_count}</dd></div>
          <div><dt className="text-[var(--color-text-muted)]">Tipo</dt><dd>{data?.doc_type ?? "—"}</dd></div>
          <div><dt className="text-[var(--color-text-muted)]">Indexado</dt><dd className="font-mono">{data?.ingested_at?.slice(0, 10)}</dd></div>
        </dl>
      </aside>
    </div>
  );
}

export const Route = createFileRoute("/_app/documentos/$docId")({ component: DocView });
