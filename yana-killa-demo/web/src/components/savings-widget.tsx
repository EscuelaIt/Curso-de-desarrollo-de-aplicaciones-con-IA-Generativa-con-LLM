import { useEffect, useState } from "react";
import { savings, useSavings } from "@/lib/savings-store";
import { RotateCcw } from "lucide-react";

export function SavingsWidget() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const items = useSavings();
  const effective = mounted ? items : [];
  const total = effective.reduce((a, e) => a + e.savedMinutes, 0);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return (
    <div className="fixed bottom-4 right-4 z-40 rounded border bg-white/95 backdrop-blur px-3 py-2 text-xs shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
            Ahorro acumulado
          </div>
          <div
            className="font-mono text-sm tabular-nums"
            style={{ color: "var(--color-accent-copper)" }}
          >
            {h > 0 ? `${h}h ${m}min` : `${m} min`}
          </div>
          <div className="text-[10px] text-[var(--color-text-muted)]">
            {effective.length} consultas
          </div>
        </div>
        {effective.length > 0 && (
          <button
            type="button"
            onClick={() => savings.reset()}
            title="Resetear ahorro acumulado"
            aria-label="Resetear ahorro acumulado"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-accent-copper)] transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
