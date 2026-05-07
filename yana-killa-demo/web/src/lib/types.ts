export type DocumentMeta = {
  id: string;
  title: string;
  filename: string;
  doc_type: string | null;
  zone: string | null;
  campaign: string | null;
  status: string;
  page_count: number;
  ingested_at: string;
};

export type SearchResult = {
  chunk_id: string;
  doc_id: string;
  doc_title: string;
  doc_filename: string;
  page: number;
  heading: string | null;
  excerpt: string;
  score: number;
};

export type Citation = {
  id: number;
  chunk_id: string;
  doc_id: string | null;
  doc_title: string;
  doc_filename: string;
  page: number | null;
  excerpt: string;
};

export type ChatFinal = {
  answer_markdown: string;
  citations: Citation[];
  latency_ms?: number;
  error?: string;
};

export type LLMModelList = {
  default: string;
  available: string[];
};
