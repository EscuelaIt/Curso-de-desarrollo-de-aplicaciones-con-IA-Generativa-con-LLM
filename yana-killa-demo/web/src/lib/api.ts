import type {
  DocumentMeta, SearchResult, ChatFinal, LLMModelList
} from "./types";
import { authHeaders, clearToken, getToken } from "./auth";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export class AuthError extends Error {
  constructor() {
    super("auth_required");
  }
}

async function handleUnauthorized(r: Response) {
  if (r.status === 401) {
    clearToken();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.assign("/login?next=" + encodeURIComponent(window.location.pathname));
    }
    throw new AuthError();
  }
}

async function req(path: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
    ...authHeaders(),
  };
  const r = await fetch(`${BASE}${path}`, { ...init, headers });
  await handleUnauthorized(r);
  return r;
}

export async function login(token: string): Promise<{ auth_required: boolean }> {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (r.status === 401) throw new Error("Token inválido");
  if (!r.ok) throw new Error(`login: ${r.status}`);
  return r.json();
}

export async function authCheck(): Promise<{ auth_required: boolean }> {
  const r = await req("/api/auth/check");
  if (!r.ok) throw new Error(`auth_check: ${r.status}`);
  return r.json();
}

export async function listDocuments(): Promise<DocumentMeta[]> {
  const r = await req("/api/documents");
  if (!r.ok) throw new Error(`documents: ${r.status}`);
  return r.json();
}

export async function getDocument(docId: string): Promise<DocumentMeta> {
  const r = await req(`/api/documents/${docId}`);
  if (!r.ok) throw new Error(`document_${r.status}`);
  return r.json();
}

export async function searchDocs(q: string): Promise<{ results: SearchResult[] }> {
  const r = await req(`/api/search?q=${encodeURIComponent(q)}`);
  if (!r.ok) throw new Error(`search: ${r.status}`);
  return r.json();
}

export async function listModels(): Promise<LLMModelList> {
  const r = await req("/api/llm/models");
  if (!r.ok) throw new Error(`models: ${r.status}`);
  return r.json();
}

export function chatStream(
  query: string,
  model: string | undefined,
  onToken: (delta: string) => void,
  onRetrieved: (rs: { chunk_id: string; doc_title: string; page: number }[]) => void,
  onFinal: (f: ChatFinal) => void,
  onError: (e: unknown) => void,
  onAnswerComplete?: () => void,
): AbortController {
  const ac = new AbortController();
  fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ query, model }),
    signal: ac.signal,
  }).then(async (r) => {
    await handleUnauthorized(r);
    if (r.status === 429) throw new Error("Has superado el límite de consultas por hora.");
    if (!r.ok || !r.body) throw new Error(`chat_${r.status}`);
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const frames = buf.split("\n\n");
      buf = frames.pop() ?? "";
      for (const frame of frames) {
        const ev = /^event: (\w+)/.exec(frame)?.[1];
        const dataLine = frame.split("\n").find((l) => l.startsWith("data: "));
        if (!ev || !dataLine) continue;
        const data = JSON.parse(dataLine.slice(6));
        if (ev === "token") onToken(data.delta);
        else if (ev === "retrieved") onRetrieved(data);
        else if (ev === "final") onFinal(data);
        else if (ev === "answer_complete") onAnswerComplete?.();
        else if (ev === "error") onError(new Error(data.message ?? "Unknown error"));
      }
    }
  }).catch(onError);
  return ac;
}

export async function ingestFile(
  file: File,
  docType?: string,
  zone?: string,
): Promise<{ doc_id: string; filename: string; status: string }> {
  const fd = new FormData();
  fd.append("file", file);
  if (docType) fd.append("doc_type", docType);
  if (zone) fd.append("zone", zone);
  const r = await fetch(`${BASE}/api/ingest`, {
    method: "POST",
    body: fd,
    headers: { ...authHeaders() },
  });
  await handleUnauthorized(r);
  if (r.status === 413) throw new Error("El archivo supera el tamaño máximo permitido.");
  if (r.status === 429) throw new Error("Has superado el límite de cargas por hora.");
  if (!r.ok) throw new Error(`ingest_${r.status}`);
  return r.json();
}

export function pdfUrl(docId: string): string {
  return `${BASE}/api/documents/${docId}/file`;
}

export function pdfFileDescriptor(docId: string): { url: string; httpHeaders: Record<string, string> } {
  return { url: pdfUrl(docId), httpHeaders: authHeaders() };
}

export function hasToken(): boolean {
  return getToken() !== null;
}
