import json
import re
from dataclasses import dataclass
from typing import List

@dataclass
class CitationSpec:
    id: int
    chunk_id: str
    excerpt: str = ""

@dataclass
class ParsedAnswer:
    answer_markdown: str
    citations: List[CitationSpec]

_JSON_FENCE_RE = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)
_ANSWER_KEY_RE = re.compile(r'"answer_markdown"\s*:\s*"')

def parse_response(raw: str) -> ParsedAnswer:
    text = raw.strip()
    match = _JSON_FENCE_RE.search(text)
    if match:
        text = match.group(1)
    else:
        first = text.find("{")
        if first >= 0:
            text = text[first:]
    data = json.loads(text)
    citations = [CitationSpec(**c) for c in data.get("citations", [])]
    return ParsedAnswer(
        answer_markdown=data["answer_markdown"],
        citations=citations,
    )


class AnswerStreamExtractor:
    def __init__(self) -> None:
        self._buf = ""
        self._emit_pos = -1
        self._done = False

    @property
    def done(self) -> bool:
        return self._done

    def feed(self, delta: str) -> str:
        if self._done:
            return ""
        self._buf += delta
        if self._emit_pos < 0:
            m = _ANSWER_KEY_RE.search(self._buf)
            if not m:
                return ""
            self._emit_pos = m.end()

        i = self._emit_pos
        out_parts: list[str] = []
        while i < len(self._buf):
            ch = self._buf[i]
            if ch == "\\":
                if i + 1 >= len(self._buf):
                    break
                nxt = self._buf[i + 1]
                if nxt == "n":
                    out_parts.append("\n")
                elif nxt == "t":
                    out_parts.append("\t")
                elif nxt == "r":
                    out_parts.append("\r")
                elif nxt == '"':
                    out_parts.append('"')
                elif nxt == "\\":
                    out_parts.append("\\")
                elif nxt == "/":
                    out_parts.append("/")
                elif nxt == "u":
                    if i + 6 > len(self._buf):
                        break
                    try:
                        out_parts.append(chr(int(self._buf[i + 2:i + 6], 16)))
                    except ValueError:
                        out_parts.append("\\" + nxt)
                    i += 6
                    continue
                else:
                    out_parts.append(ch + nxt)
                i += 2
            elif ch == '"':
                self._done = True
                self._emit_pos = i + 1
                return "".join(out_parts)
            else:
                out_parts.append(ch)
                i += 1
        self._emit_pos = i
        return "".join(out_parts)
