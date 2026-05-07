import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { login } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { toast } from "@/lib/toast-store";
import { Button } from "@/components/ui/button";

type Search = { next?: string };

function Login() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || busy) return;
    setBusy(true);
    try {
      await login(value.trim());
      setToken(value.trim());
      toast.success("Acceso concedido");
      navigate({ to: next ?? "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error de autenticación");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface)] p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded border bg-[var(--color-background)] p-6 shadow-sm"
      >
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--color-text-muted)]">
            Yana Killa · Hidrogeología
          </p>
          <h1 className="font-display text-xl mt-1">Acceso al piloto</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            Ingresa el código de acceso que te compartió Deep Skill.
          </p>
        </div>
        <input
          type="password"
          autoFocus
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Código de acceso"
          className="w-full rounded border px-3 py-2 text-sm bg-[var(--color-background)]"
        />
        <Button type="submit" disabled={busy || !value.trim()} className="w-full">
          {busy ? "Verificando…" : "Entrar"}
        </Button>
        <p className="text-[10px] text-[var(--color-text-muted)] text-center">
          Las consultas se mantienen dentro del entorno del piloto.
        </p>
      </form>
    </div>
  );
}

export const Route = createFileRoute("/login")({
  component: Login,
  validateSearch: (search: Record<string, unknown>): Search => ({
    next: typeof search.next === "string" ? search.next : undefined,
  }),
});
