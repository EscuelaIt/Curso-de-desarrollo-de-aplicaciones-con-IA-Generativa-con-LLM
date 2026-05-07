import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { chatStream, AuthError } from "@/lib/api";
import { useLLMStore } from "@/lib/llm-store";
import { savings } from "@/lib/savings-store";
import { toast } from "@/lib/toast-store";
import { ChatMessage } from "@/components/chat-message";
import { PdfSlideover } from "@/components/pdf-slideover";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { ChatFinal, Citation } from "@/lib/types";

type QueryKind = "simple" | "comparison" | "report";
type Msg = { role: "user" | "assistant"; markdown: string; citations?: Citation[] };

const PRESETS: { label: string; q: string; type: QueryKind }[] = [
  { label: "Comparar DS-024 vs ICOLD 194", q: "Compara los requisitos de monitoreo piezométrico entre el DS-024 peruano y el ICOLD Bulletin 194. ¿Dónde hay brechas?", type: "comparison" },
  { label: "Resumen post-Feijao", q: "Genera un resumen ejecutivo sobre mejores prácticas post-Feijao para monitoreo de presas, combinando el Panel Experto de Feijao, el Global Industry Standard e ICOLD 194.", type: "report" },
  { label: "Frecuencia DS-024", q: "¿Qué dice el DS-024 sobre frecuencia de monitoreo de presas de relaves?", type: "simple" },
];

function classifyQuery(q: string): QueryKind {
  const s = q.toLowerCase();
  if (/\b(compar|versus|\bvs\b|brechas?|diferenci)/i.test(s)) return "comparison";
  if (/\b(resumen|resume|sintet|reporte|informe ejecut|ejecutiv)/i.test(s)) return "report";
  return "simple";
}

function Chat() {
  const model = useLLMStore((s) => s.model);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [preparingCitations, setPreparingCitations] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [slideover, setSlideover] = useState<{ docId: string | null; page: number | null; open: boolean }>({ docId: null, page: null, open: false });
  const acRef = useRef<AbortController | null>(null);

  function send(query: string, kind: QueryKind) {
    if (!query.trim() || streaming) return;
    setErrorMsg(null);
    setPreparingCitations(false);
    setMsgs((m) => [...m, { role: "user", markdown: query }]);
    setInput("");
    setStreaming(true);
    let partial = "";
    let completed = false;
    setMsgs((m) => [...m, { role: "assistant", markdown: "" }]);

    acRef.current = chatStream(
      query, model,
      (delta) => {
        partial += delta;
        setMsgs((m) => {
          const out = [...m];
          out[out.length - 1] = { role: "assistant", markdown: partial };
          return out;
        });
      },
      () => {},
      (final: ChatFinal) => {
        completed = true;
        setPreparingCitations(false);
        setMsgs((m) => {
          const out = [...m];
          out[out.length - 1] = { role: "assistant", markdown: final.answer_markdown, citations: final.citations };
          return out;
        });
        if (final.error) {
          toast.error("El asistente devolvió una respuesta incompleta: " + final.error);
        } else {
          savings.add(kind);
        }
        setStreaming(false);
      },
      (e) => {
        setStreaming(false);
        setPreparingCitations(false);
        if (completed || e instanceof AuthError) return;
        const message = e instanceof Error ? e.message : String(e);
        toast.error(message);
        setErrorMsg(message);
        setMsgs((m) => m.slice(0, -2));
      },
      () => setPreparingCitations(true),
    );
  }

  function newChat() {
    acRef.current?.abort();
    setMsgs([]);
    setInput("");
    setErrorMsg(null);
    setStreaming(false);
    setPreparingCitations(false);
  }

  return (
    <div className="flex flex-col h-full max-w-[820px] mx-auto px-6 pb-6">
      <div className="py-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Asistente</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Pregunta en lenguaje natural. Cada respuesta cita su fuente.</p>
        </div>
        {msgs.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={newChat}
            className="cursor-pointer hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
          >
            Nueva conversación
          </Button>
        )}
      </div>
      {msgs.length === 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {PRESETS.map((p) => (
            <button key={p.label} onClick={() => send(p.q, p.type)}
              className="text-left border rounded p-3 text-xs cursor-pointer hover:bg-[var(--color-surface)]">
              <div className="font-medium mb-1">{p.label}</div>
              <div className="text-[var(--color-text-muted)] line-clamp-2">{p.q}</div>
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pr-3 -mr-3 [scrollbar-gutter:stable]">
        {msgs.map((m, i) => (
          <ChatMessage key={i} role={m.role} markdown={m.markdown} citations={m.citations}
            onCitationClick={(c) => setSlideover({ docId: c.doc_id, page: c.page, open: true })} />
        ))}
        {preparingCitations && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] py-2">
            <span className="inline-flex gap-1" aria-hidden="true">
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:300ms]" />
            </span>
            <span>Preparando citas…</span>
          </div>
        )}
      </div>
      {errorMsg && (
        <div
          role="alert"
          className="mt-4 border border-[var(--color-error)] bg-[var(--color-error)]/10 text-[var(--color-error)] rounded p-3 text-sm"
        >
          <div className="font-medium mb-1">No se pudo completar la consulta</div>
          <div className="text-xs font-mono whitespace-pre-wrap break-words">{errorMsg}</div>
        </div>
      )}
      <div className="pt-4 border-t">
        <Textarea value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input, classifyQuery(input)); }
          }} />
        <div className="flex justify-end mt-2">
          <Button disabled={streaming || !input.trim()} onClick={() => send(input, classifyQuery(input))}>Enviar</Button>
        </div>
      </div>
      <PdfSlideover {...slideover} onClose={() => setSlideover({ ...slideover, open: false })} />
    </div>
  );
}

export const Route = createFileRoute("/_app/chat")({ component: Chat });
