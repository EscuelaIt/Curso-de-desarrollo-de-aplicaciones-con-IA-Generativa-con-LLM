import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listDocuments } from "@/lib/api";
import { StatCard } from "@/components/stat-card";

function Dashboard() {
  const { data: docs } = useQuery({ queryKey: ["documents"], queryFn: listDocuments });
  const docCount = docs?.length ?? 0;
  const pageCount = docs?.reduce((a, d) => a + d.page_count, 0) ?? 0;
  const types = new Set(docs?.map((d) => d.doc_type ?? "sin tipo"));

  return (
    <div className="p-8 max-w-[1280px]">
      <div className="mb-6">
        <h1 className="font-display text-2xl">Panel</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Resumen del acervo indexado</p>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Documentos" value={docCount} hint="indexados" />
        <StatCard label="Páginas" value={pageCount.toLocaleString("es-PE")} />
        <StatCard label="Tipos cubiertos" value={types.size} />
        <StatCard label="Estado" value="Listo" hint="RAG en línea" />
      </div>
      <section className="mt-8 border rounded p-4">
        <div className="text-sm font-medium mb-2">Recientemente indexados</div>
        <ul className="text-sm divide-y">
          {(docs ?? []).slice(0, 8).map((d) => (
            <li key={d.id} className="py-2 flex justify-between">
              <span>{d.title}</span>
              <span className="text-[var(--color-text-muted)] font-mono text-xs">p. {d.page_count}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export const Route = createFileRoute("/_app/")({ component: Dashboard });
