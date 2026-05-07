type ToastKind = "error" | "info" | "success";
export type Toast = { id: number; kind: ToastKind; message: string };

let seq = 1;
const listeners = new Set<() => void>();
let items: Toast[] = [];

function emit() {
  for (const l of listeners) l();
}

function push(kind: ToastKind, message: string, ttlMs = 5000) {
  const id = seq++;
  items = [...items, { id, kind, message }];
  emit();
  if (typeof window !== "undefined") {
    window.setTimeout(() => {
      items = items.filter((t) => t.id !== id);
      emit();
    }, ttlMs);
  }
}

export const toast = {
  error: (m: string) => push("error", m, 6000),
  info: (m: string) => push("info", m),
  success: (m: string) => push("success", m),
  dismiss: (id: number) => {
    items = items.filter((t) => t.id !== id);
    emit();
  },
};

export function subscribeToasts(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getToasts(): Toast[] {
  return items;
}
