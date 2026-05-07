import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

type ThemeMode = "light" | "dark" | "auto"

function getInitialMode(): ThemeMode {
  if (typeof window === "undefined") return "auto"
  const stored = window.localStorage.getItem("theme")
  if (stored === "light" || stored === "dark" || stored === "auto") return stored
  return "auto"
}

function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode !== "auto") return mode
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyThemeMode(mode: ThemeMode) {
  const resolved = resolveTheme(mode)
  const root = document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add(resolved)
  if (mode === "auto") {
    root.removeAttribute("data-theme")
  } else {
    root.setAttribute("data-theme", mode)
  }
  root.style.colorScheme = resolved
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("auto")
  const [resolved, setResolved] = useState<"light" | "dark">("light")

  useEffect(() => {
    const initial = getInitialMode()
    setMode(initial)
    setResolved(resolveTheme(initial))
    applyThemeMode(initial)
  }, [])

  useEffect(() => {
    if (mode !== "auto") return
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => {
      setResolved(resolveTheme("auto"))
      applyThemeMode("auto")
    }
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [mode])

  function toggleMode() {
    const nextMode: ThemeMode =
      mode === "light" ? "dark" : mode === "dark" ? "auto" : "light"
    setMode(nextMode)
    setResolved(resolveTheme(nextMode))
    applyThemeMode(nextMode)
    window.localStorage.setItem("theme", nextMode)
  }

  const label =
    mode === "auto"
      ? "Cambiar a modo claro"
      : mode === "light"
        ? "Cambiar a modo oscuro"
        : "Cambiar a modo automático"

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleMode}
      aria-label={label}
      title={label}
    >
      {resolved === "dark" ? (
        <Sun className="h-[1.15rem] w-[1.15rem]" />
      ) : (
        <Moon className="h-[1.15rem] w-[1.15rem]" />
      )}
    </Button>
  )
}
