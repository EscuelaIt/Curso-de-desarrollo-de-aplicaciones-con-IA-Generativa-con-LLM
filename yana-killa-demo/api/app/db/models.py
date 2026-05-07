from dataclasses import dataclass
from typing import Optional

@dataclass
class Document:
    id: str
    title: str
    filename: str
    doc_type: Optional[str]
    zone: Optional[str]
    campaign: Optional[str]
    page_count: int
    ingested_at: str
    source_path: str
    markdown_path: Optional[str]
    status: str = "approved"

@dataclass
class Chunk:
    id: str
    doc_id: str
    ordinal: int
    page: int
    heading: Optional[str]
    text: str
    token_count: int
