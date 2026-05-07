import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { searchDocs } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PdfSlideover } from "@/components/pdf-slideover";

function Buscar() {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const { data, isFetching } = useQuery({
    queryKey: ["search", submitted],
    queryFn: () => searchDocs(submitted),
    enabled: Boolean(submitted),
  });
  const [slideover, setSlideover] = useState<{ docId: string | null; page: number | null; open: boolean }>({ docId: null, page: null, open: false });

  return (
    <div className="p-8 max-w-[960px]">
      <div className="mb-6">
        <h1 className="font-display text-2xl">Búsqueda semántica</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Híbrida — palabras clave + significado.</p>
      </div>
      <div className="flex gap-2 mb-6">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="p. ej. frecuencia de monitoreo piezométrico"
          onKeyDown={(e) => e.key === "Enter" && setSubmitted(q)} />
        <Button onClick={() => setSubmitted(q)} disabled={!q.trim()}>Buscar</Button>
      </div>
      {isFetching && <div className="text-sm text-[var(--color-text-muted)]">Buscando…</div>}
      {data && (
        <ol className="divide-y">
          {data.results.map((r) => (
            <li key={r.chunk_id} className="py-3">
              <button className="text-left w-full hover:bg-[var(--color-surface)] -mx-2 px-2 py-1 rounded"
                onClick={() => setSlideover({ docId: r.doc_id, page: r.page, open: true })}>
                <div className="flex items-baseline justify-between">
                  <div className="text-sm font-medium">{r.doc_title}</div>
                  <div className="text-xs font-mono text-[var(--color-text-muted)]">p.{r.page}</div>
                </div>
                {r.heading && <div className="text-xs text-[var(--color-text-muted)]">{r.heading}</div>}
                <div className="text-sm mt-1">{r.excerpt}</div>
              </button>
            </li>
          ))}
        </ol>
      )}
      <PdfSlideover {...slideover} onClose={() => setSlideover({ ...slideover, open: false })} />
    </div>
  );
}

export const Route = createFileRoute("/_app/buscar")({ component: Buscar });
