import { Outlet } from "@tanstack/react-router";
import { NavRail } from "./nav-rail";
import { TopBar } from "./top-bar";
import { SavingsWidget } from "./savings-widget";

export function AppShell() {
  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <NavRail />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <footer className="h-7 border-t text-[10px] text-[var(--color-text-muted)] px-4 flex items-center">
        v0.1.0 · 100 % ejecutándose en este entorno · código fuente abierto
      </footer>
      <SavingsWidget />
    </div>
  );
}
