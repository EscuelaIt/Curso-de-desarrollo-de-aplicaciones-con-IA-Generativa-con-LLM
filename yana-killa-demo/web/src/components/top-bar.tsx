import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { clearToken, getToken } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";

export function TopBar() {
  const navigate = useNavigate();
  const authActive = typeof window !== "undefined" && !!getToken();
  return (
    <header className="h-12 border-b px-4 flex items-center justify-between">
      <div className="flex items-center gap-3 text-sm">
        <span className="font-display font-medium tracking-tight">Deep Skill</span>
        <span className="text-[var(--color-text-muted)]">·</span>
        <span className="text-[var(--color-text-muted)]">
          Yana Killa · Hidrogeología
        </span>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <div className="h-7 w-7 rounded-full bg-[var(--color-surface)] grid place-items-center text-xs ml-2">
          M
        </div>
        {authActive && (
          <button
            onClick={() => {
              clearToken();
              navigate({ to: "/login" });
            }}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </header>
  );
}
