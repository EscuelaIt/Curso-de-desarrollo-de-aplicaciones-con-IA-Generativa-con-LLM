const KEY = "yanakilla_pilot_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(KEY);
}

export function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { "X-Pilot-Token": t } : {};
}
