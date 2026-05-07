export function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="border rounded p-4 bg-[var(--color-surface-elevated)]">
      <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-1 font-mono text-2xl tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">{hint}</div>}
    </div>
  );
}
