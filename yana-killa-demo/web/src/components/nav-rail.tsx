import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  Search,
  UploadCloud,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/repositorio", icon: FolderOpen, label: "Repositorio" },
  { to: "/chat", icon: MessageSquare, label: "Asistente" },
  { to: "/buscar", icon: Search, label: "Búsqueda" },
  { to: "/cargar", icon: UploadCloud, label: "Cargar" },
];

export function NavRail() {
  return (
    <aside className="w-16 border-r flex flex-col py-4">
      {items.map((i) => (
        <Link
          key={i.to}
          to={i.to}
          className="group flex flex-col items-center justify-center py-3 text-[10px] text-[var(--color-text-muted)]"
          activeProps={{
            className:
              "text-[var(--color-text-primary)] bg-[var(--color-surface)]",
          }}
        >
          {({ isActive }) => (
            <>
              <i.icon
                className={cn(
                  "h-5 w-5 mb-0.5",
                  isActive && "stroke-[var(--color-accent)]",
                )}
              />
              <span>{i.label}</span>
            </>
          )}
        </Link>
      ))}
    </aside>
  );
}
