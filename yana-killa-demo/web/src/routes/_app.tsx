import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { getToken } from "@/lib/auth";

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ location }) => {
    if (typeof window === "undefined") return;
    if (!getToken()) {
      throw redirect({ to: "/login", search: { next: location.pathname } });
    }
  },
  component: AppShell,
});
