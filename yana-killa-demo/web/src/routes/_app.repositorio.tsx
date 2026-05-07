import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { listDocuments } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

function Repositorio() {
  const { data: docs } = useQuery({ queryKey: ["documents"], queryFn: listDocuments });
  const [q, setQ] = useState("");
  const [type, setType] = useState<string | null>(null);

  const types = useMemo(() => {
    const s = new Set<string>();
    docs?.forEach((d) => d.doc_type && s.add(d.doc_type));
    return Array.from(s);
  }, [docs]);

  const filtered = (docs ?? []).filter((d) => {
    if (type && d.doc_type !== type) return false;
    if (q && !d.title.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-8 max-w-[1280px]">
      <div className="mb-6">
        <h1 className="font-display text-2xl">Repositorio documental</h1>
        <p className="text-sm text-[var(--color-text-muted)]">{filtered.length} de {docs?.length ?? 0} documentos</p>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Input placeholder="Filtrar por título…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        <Badge variant={type === null ? "default" : "outline"} onClick={() => setType(null)} className="cursor-pointer">Todos</Badge>
        {types.map((t) => (
          <Badge key={t} variant={type === t ? "default" : "outline"} onClick={() => setType(t)} className="cursor-pointer">{t}</Badge>
        ))}
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-[11px] uppercase tracking-wide text-[var(--color-text-muted)] border-b">
          <tr>
            <th className="py-2">Documento</th>
            <th className="py-2">Tipo</th>
            <th className="py-2">Zona</th>
            <th className="py-2 text-right">Páginas</th>
            <th className="py-2">Indexado</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {filtered.map((d) => (
            <tr key={d.id} className="hover:bg-[var(--color-surface)]">
              <td className="py-2">
                <Link className="hover:underline" to="/documentos/$docId" params={{ docId: d.id }}>{d.title}</Link>
                <div className="text-[11px] text-[var(--color-text-muted)] font-mono">{d.filename}</div>
              </td>
              <td className="py-2">{d.doc_type ?? "—"}</td>
              <td className="py-2">{d.zone ?? "—"}</td>
              <td className="py-2 text-right font-mono tabular-nums">{d.page_count}</td>
              <td className="py-2 text-[var(--color-text-muted)] font-mono text-xs">{new Date(d.ingested_at).toLocaleDateString("es-PE")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const Route = createFileRoute("/_app/repositorio")({ component: Repositorio });
