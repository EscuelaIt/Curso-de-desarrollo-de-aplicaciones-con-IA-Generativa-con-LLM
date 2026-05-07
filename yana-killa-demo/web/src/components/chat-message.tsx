import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReactNode } from "react";
import { CitationChip } from "./citation-chip";
import type { Citation } from "@/lib/types";

const CITE_RE = /\[\s*(\^\d+(?:\s*,\s*\^\d+)*)\s*\]/g;
const PLACEHOLDER_RE = /§§CITE:(\d+)§§/g;

function encodeCitations(src: string): string {
  return src.replace(CITE_RE, (_match, group: string) => {
    const nums = group.match(/\d+/g) ?? [];
    return nums.map((n) => `§§CITE:${n}§§`).join("");
  });
}

function renderTextWithCitations(
  text: string,
  byId: Map<number, Citation>,
  onCitationClick?: (c: Citation) => void,
): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let keyCounter = 0;
  let m: RegExpExecArray | null;
  PLACEHOLDER_RE.lastIndex = 0;
  while ((m = PLACEHOLDER_RE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const n = Number(m[1]);
    const c = byId.get(n);
    if (c) {
      out.push(
        <CitationChip key={`c-${keyCounter++}`} c={c} onClick={() => onCitationClick?.(c)} />,
      );
    } else {
      out.push(<sup key={`s-${keyCounter++}`}>[{n}]</sup>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function walkChildren(
  children: ReactNode,
  byId: Map<number, Citation>,
  onCitationClick?: (c: Citation) => void,
): ReactNode {
  if (typeof children === "string") {
    return renderTextWithCitations(children, byId, onCitationClick);
  }
  if (Array.isArray(children)) {
    return children.map((child, i) => {
      if (typeof child === "string") {
        return <span key={i}>{renderTextWithCitations(child, byId, onCitationClick)}</span>;
      }
      return child;
    });
  }
  return children;
}

export function ChatMessage({
  role, markdown, citations, onCitationClick,
}: {
  role: "user" | "assistant";
  markdown: string;
  citations?: Citation[];
  onCitationClick?: (c: Citation) => void;
}) {
  const byId = new Map(citations?.map((c) => [c.id, c]) ?? []);
  const isEmptyAssistant = role === "assistant" && markdown.length === 0;
  const encoded = encodeCitations(markdown);

  return (
    <div className={`py-4 ${role === "user" ? "" : "border-t"}`}>
      <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
        {role === "user" ? "Pregunta" : "Asistente"}
      </div>
      {isEmptyAssistant ? (
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <span className="inline-flex gap-1" aria-hidden="true">
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:300ms]" />
          </span>
          <span>Procesando respuesta…</span>
        </div>
      ) : role === "user" ? (
        <div className="text-sm leading-relaxed">{markdown}</div>
      ) : (
        <div className="text-sm leading-[1.7] text-justify [&_*]:break-words" lang="es">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => (
                <p className="mb-3 last:mb-0">
                  {walkChildren(children, byId, onCitationClick)}
                </p>
              ),
              li: ({ children }) => (
                <li className="mb-1">{walkChildren(children, byId, onCitationClick)}</li>
              ),
              h1: ({ children }) => (
                <h1 className="text-xl font-display mt-5 mb-3 first:mt-0">
                  {walkChildren(children, byId, onCitationClick)}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-display mt-5 mb-3 first:mt-0">
                  {walkChildren(children, byId, onCitationClick)}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-display mt-4 mb-2 first:mt-0">
                  {walkChildren(children, byId, onCitationClick)}
                </h3>
              ),
              h4: ({ children }) => (
                <h4 className="text-sm font-semibold mt-4 mb-2 first:mt-0">
                  {walkChildren(children, byId, onCitationClick)}
                </h4>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold">
                  {walkChildren(children, byId, onCitationClick)}
                </strong>
              ),
              em: ({ children }) => <em>{walkChildren(children, byId, onCitationClick)}</em>,
              ul: ({ children }) => (
                <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-6 mb-3 space-y-1">{children}</ol>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-[var(--color-border)] pl-3 my-3 text-[var(--color-text-muted)]">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-3">
                  <table className="text-sm border-collapse w-full">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border px-2 py-1 text-left font-medium bg-[var(--color-surface)]">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border px-2 py-1 align-top">
                  {walkChildren(children, byId, onCitationClick)}
                </td>
              ),
              code: ({ children }) => (
                <code className="font-mono text-xs bg-[var(--color-surface)] px-1 py-0.5 rounded">
                  {children}
                </code>
              ),
            }}
          >
            {encoded}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
