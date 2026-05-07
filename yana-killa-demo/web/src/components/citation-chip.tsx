import type { Citation } from "@/lib/types";

export function CitationChip({ c, onClick }: { c: Citation; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-mono border hover:bg-[color-mix(in_oklab,var(--color-accent-copper)_10%,transparent)]"
      style={{ borderColor: "var(--color-accent-copper)", color: "var(--color-accent-copper)" }}
      title={c.excerpt}
    >
      📄 {c.doc_filename} · p.{c.page ?? "?"}
    </button>
  );
}
