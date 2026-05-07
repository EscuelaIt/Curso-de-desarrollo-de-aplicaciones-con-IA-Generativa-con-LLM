import { useSyncExternalStore } from "react";
import { getToasts, subscribeToasts, toast, type Toast } from "@/lib/toast-store";

function kindClasses(kind: Toast["kind"]): string {
  if (kind === "error")
    return "border-[var(--color-error)] text-[var(--color-error)]";
  if (kind === "success")
    return "border-[var(--color-success)] text-[var(--color-success)]";
  return "border-[var(--color-border)] text-[var(--color-text-primary)]";
}

export function Toaster() {
  const items = useSyncExternalStore(subscribeToasts, getToasts, getToasts);
  if (items.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {items.map((t) => (
        <div
          key={t.id}
          className={`rounded border bg-[var(--color-background)] px-3 py-2 text-xs shadow-md ${kindClasses(t.kind)}`}
          role="status"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="[overflow-wrap:anywhere]">{t.message}</span>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
