import re
from dataclasses import dataclass
from typing import List, Optional
from .pdf_to_markdown import PageMarkdown

HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$", re.MULTILINE)

def _count_tokens(text: str) -> int:
    return len(text.split())

@dataclass
class Chunk:
    page: int
    ordinal: int
    heading: Optional[str]
    text: str
    token_count: int

def chunk_pages(
    pages: List[PageMarkdown],
    target_tokens: int = 800,
    overlap_tokens: int = 100,
) -> List[Chunk]:
    all_chunks: List[Chunk] = []
    ordinal = 0
    current_heading: Optional[str] = None

    for page in pages:
        text = page.text
        words = text.split()

        heading_at: List[tuple[int, str]] = []
        for m in HEADING_RE.finditer(text):
            heading_text = m.group(2).strip()
            words_before = len(text[:m.end()].split())
            heading_at.append((words_before, heading_text))

        i = 0
        while i < len(words):
            window_end = min(i + target_tokens, len(words))
            window = words[i:window_end]
            window_text = " ".join(window)

            for word_idx, htext in heading_at:
                if word_idx <= window_end:
                    current_heading = htext

            all_chunks.append(Chunk(
                page=page.page_number,
                ordinal=ordinal,
                heading=current_heading,
                text=window_text,
                token_count=len(window),
            ))
            ordinal += 1
            if window_end >= len(words):
                break
            i += target_tokens - overlap_tokens

    return all_chunks
