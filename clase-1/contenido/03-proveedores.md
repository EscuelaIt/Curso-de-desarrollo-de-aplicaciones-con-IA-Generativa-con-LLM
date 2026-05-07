# Bloque 3 — Ecosistema de Proveedores LLM (abril 2026)

> Dossier para la **Clase 1** del curso *Arquitectura de Aplicaciones con IA Generativa* (EscuelaIT). Nivel: desarrolladores intermedio-avanzados.
>
> **Aviso metodológico**: los precios que cito corresponden al estado conocido hasta principios de 2026 y **deben reverificarse** en las páginas oficiales enlazadas en "Fuentes" antes de proyectar la clase. El mercado LLM renegocia precios cada 6-8 semanas: trata cualquier cifra como "orden de magnitud", no como verdad de factura. Recomendación: abrir en vivo [artificialanalysis.ai](https://artificialanalysis.ai) y mostrar la tabla del día.

---

## 1. Mapa del ecosistema (abril 2026)

El ecosistema LLM ya no es "OpenAI vs. el resto". A abril de 2026 conviven seis capas que un arquitecto debe conocer porque cada una impone un contrato distinto (API, pricing, compliance, latencia).

### 1.1 Labs propietarios frontier (cerrados, API-first)
- **Anthropic** — familia Claude (Haiku / Sonnet / Opus). Foco: safety, razonamiento largo, *tool use* y Claude Code/MCP como estándar.
- **OpenAI** — familia GPT-5 + o-series (reasoning). Foco: ecosistema más ancho (Assistants, Responses API, Realtime, Sora, Whisper, embeddings).
- **Google DeepMind** — Gemini 2.5 Pro / Flash / Flash-Lite, integrado en Vertex y AI Studio. Foco: contexto masivo (1M+ tokens), multimodal nativo, grounding con Search.
- **xAI** — Grok 3 / Grok 4. Foco: acceso en tiempo real a X (Twitter), menos restricciones de contenido, integración con Tesla/X Premium.

### 1.2 Labs chinos (API barata, open weights cuando conviene)
- **DeepSeek** — DeepSeek-V3 (general) y DeepSeek-R1 (reasoning). MoE ~671B, ~37B activos. Precio disruptivo (~5-10× más barato que frontier US).
- **Alibaba Qwen** — Qwen3 (dense + MoE), Qwen3-Coder, Qwen-VL. Open weights Apache-2.0 en la mayoría de tallas.
- **Zhipu / GLM** — GLM-4.5/4.6, fuerte en chino y tool use.
- **Moonshot / Kimi** — Kimi K2 (reasoning, 1M contexto).
- **ByteDance / Doubao** — Doubao 1.5 Pro. Solo API en China salvo acuerdos.

### 1.3 Open-weights serios (pesos descargables con licencia usable)
- **Meta** — Llama 3.3, Llama 4 (Scout / Maverick MoE). Licencia Llama Community (quasi-open, restricciones > 700M MAU).
- **Mistral AI** — Mistral Large 2, Mistral Small 3, Codestral, Pixtral, Ministral (edge). Mezcla weights abiertos (Apache) y comerciales.
- **Cohere** — Command R+ / Command A. Enfoque RAG y enterprise, weights disponibles en HuggingFace bajo licencia CC-BY-NC-4.0.
- **AI2** — OLMo 2. Verdaderamente open: data + training code + checkpoints. Academia/research.
- **NVIDIA** — Nemotron-4, Llama-Nemotron. Open weights como reference designs para su stack (NIM).

### 1.4 Infraestructura / inferencia especializada (no entrenan, ejecutan)
- **Groq** — LPU. Latencia ultra-baja (>500 tok/s en Llama 70B). Sirve Llama, Qwen, DeepSeek, Kimi, GPT-OSS.
- **Cerebras** — Wafer-scale. ~2000 tok/s en Llama 70B. Enfoque enterprise.
- **SambaNova** — RDU. Llama, DeepSeek, Qwen a ~200-500 tok/s.
- **Together AI** — GPU-based; catálogo más amplio (>200 modelos) incluyendo fine-tuning dedicado.
- **Fireworks** — GPU + FireAttention; modo *on-demand* y *dedicated deployments*.
- **Replicate** — "Docker Hub" de modelos; bueno para imagen/video + LLMs.
- **Perplexity Sonar** — API con búsqueda web integrada; cita fuentes.

### 1.5 Hyperscalers (LLMs dentro del cloud del cliente)
- **AWS Bedrock** — Claude, Llama, Mistral, Cohere, Nova (Amazon), Jamba (AI21). Data residency por región, BAA para HIPAA.
- **Azure AI Foundry** (ex Azure OpenAI Service) — GPT-5, o-series, Mistral, Llama, Phi, DeepSeek-R1 (Azure-hosted). Data boundary UE/US.
- **Google Vertex AI** — Gemini + Anthropic (Claude-on-Vertex) + Llama + Mistral.
- **Oracle OCI Generative AI** — Cohere + Llama + Meta; popular para sectores regulados.

### 1.6 Self-hosting y local
- **Ollama** — envoltorio `llama.cpp` para dev local; una línea: `ollama run llama3.3`.
- **vLLM** — motor de inferencia de producción (PagedAttention, continuous batching). Estándar de facto en GPU.
- **llama.cpp** — C++ / GGUF. CPU, Metal (Apple), Vulkan. Edge y laptop.
- **TGI (HuggingFace Text Generation Inference)** — alternativa a vLLM, buena integración HF Hub.
- **LM Studio** — GUI para descargar GGUF y servir `/v1/chat/completions` local.
- **SGLang** — motor más reciente, muy competitivo en throughput con vLLM para MoE.

---

## 2. Perfil detallado de proveedores clave

> Todos los precios son **USD por 1M tokens** salvo que se indique lo contrario. Reverificar en pricing page oficial.

### 2.1 Anthropic
- **Modelos (abril 2026)**: Claude Haiku 4.5, Claude Sonnet 4.5, Claude Opus 4.5 (+ variantes "thinking" activables vía `thinking` param).
- **Pricing orientativo**:
  - Haiku 4.5: ~$1 in / ~$5 out
  - Sonnet 4.5: ~$3 in / ~$15 out
  - Opus 4.5: ~$15 in / ~$75 out
  - **Prompt caching**: write 1.25× input, read 0.1× input (descuento 90% en hit).
  - **Batch API**: 50% off input y output.
- **Features**: prompt caching (hasta 1h TTL extendido), tool use nativo, **MCP** (Model Context Protocol, estándar abierto que Anthropic lidera), structured output (JSON schema), vision, Files API, Computer Use (beta), 200k contexto estándar y 1M en tier enterprise para Sonnet.
- **Política de datos**: **no entrenan con prompts de API** por defecto. Retention 30 días salvo *Zero Data Retention* (ZDR) para enterprise. Consumer (Claude.ai) cambió en 2025 a opt-in de training si el usuario no lo desactiva.
- **Regiones**: US y EU (Irlanda) vía AWS/GCP. Claude-on-Bedrock para data residency fina.
- **Compliance**: SOC 2 Type II, HIPAA (con BAA en Bedrock/Vertex), ISO 27001, ISO 42001.
- **Rate limits**: por tier (1-4). Tier 4: ~4000 RPM / 400k TPM en Sonnet.
- **SDKs**: `anthropic` (Python), `@anthropic-ai/sdk` (TS/JS), Go, Ruby, Java.

### 2.2 OpenAI
- **Modelos**: GPT-5, GPT-5 mini, GPT-5 nano; GPT-4.1, GPT-4.1 mini; o3, o4-mini (reasoning); Realtime (voz), Sora 2, Whisper, `text-embedding-3-*`.
- **Pricing orientativo**:
  - GPT-5: ~$1.25 in / ~$10 out (cached input ~$0.125)
  - GPT-5 mini: ~$0.25 in / ~$2 out
  - GPT-5 nano: ~$0.05 in / ~$0.40 out
  - o3: ~$2 in / ~$8 out (post-recorte 2025)
  - GPT-4.1: ~$2 in / ~$8 out
  - Batch API: 50% off.
- **Features**: **Responses API** (el nuevo "estándar" que reemplaza Chat Completions para nuevos features), Assistants v2, Structured Outputs (JSON Schema garantizado), function calling, file search, code interpreter, vision, Realtime API (audio bidireccional), prompt caching automático (50% off en hits), distillation.
- **Política de datos**: no entrenan con API por defecto desde 2023. Retention estándar 30 días; **ZDR** disponible para enterprise. ChatGPT consumer sí usa datos salvo opt-out.
- **Regiones**: US y EU (Azure OpenAI ofrece más granularidad).
- **Compliance**: SOC 2 Type II, HIPAA con BAA, GDPR DPA estándar.
- **Rate limits**: por tier (1-5). Tier 5: 10k RPM / 30M TPM en GPT-5 mini.
- **SDKs**: `openai` (Python, Node, .NET, Java, Go).

### 2.3 Google (Gemini / Vertex)
- **Modelos**: Gemini 2.5 Pro, 2.5 Flash, 2.5 Flash-Lite, Gemini 2.5 Computer Use, Imagen 4, Veo 3, embeddings (`text-embedding-004`, `gemini-embedding-001`).
- **Pricing orientativo**:
  - Gemini 2.5 Flash: ~$0.30 in / ~$2.50 out
  - Gemini 2.5 Flash-Lite: ~$0.10 in / ~$0.40 out
  - Gemini 2.5 Pro: ~$1.25 in (<200k) / ~$2.50 in (>200k) ; ~$10 out / ~$15 out (>200k)
  - Context caching: descuento ~75% sobre input.
- **Features**: **contexto 1M-2M tokens nativo**, multimodal real (video, audio, imagen, PDF), grounding con Google Search, function calling, JSON mode, **thinking budget** configurable, Live API (voz), code execution.
- **Política de datos**: AI Studio (free tier) **sí usa prompts para mejorar producto**. Vertex AI y tier de pago NO entrenan con tus datos.
- **Regiones**: docenas (Vertex AI). Data residency estricta disponible.
- **Compliance**: SOC 1/2/3, ISO 27001/27017/27018/42001, HIPAA (Vertex), FedRAMP High.
- **Rate limits**: variables por proyecto; cuotas elevadas a petición.
- **SDKs**: `google-genai` (Python, JS/TS, Go, Java — reemplaza al antiguo `google-generativeai`).

### 2.4 DeepSeek
- **Modelos**: DeepSeek-V3.1 / V3.2 (general), DeepSeek-R1 / R1-0528 (reasoning).
- **Pricing orientativo**:
  - V3: ~$0.27 in (cache miss) / ~$0.07 in (cache hit) / ~$1.10 out
  - R1: ~$0.55 in / ~$0.14 in (hit) / ~$2.19 out
  - **Descuento off-peak** (UTC 16:30-00:30): hasta -75%.
- **Features**: API **OpenAI-compatible** (cambiar `base_url` = migrar), function calling, JSON mode, cache automática. Pesos liberados bajo MIT en HuggingFace — puedes self-hostear lo mismo que consumes por API.
- **Política de datos**: T&C indican que **sí pueden usar datos** para mejorar modelo; datos en China continental. **Nunca pongas datos sensibles ni PII en DeepSeek API directa**. Workaround enterprise: consumirlo vía Fireworks, Together, SambaNova o Azure (DeepSeek-R1 hosted en Azure AI con data boundary US/EU).
- **Regiones**: API oficial → China. Hospedado en Occidente vía terceros.
- **Compliance**: la API oficial **no** es GDPR-compliant para PII. Las versiones hospedadas por hyperscalers sí.
- **Rate limits**: generosos y sin tiers estrictos; a veces degradación por capacidad.
- **SDKs**: usa `openai` SDK con `base_url="https://api.deepseek.com"`.

### 2.5 xAI
- **Modelos**: Grok 3, Grok 3 mini, Grok 4, Grok 4 Heavy, Grok Code Fast 1, Grok 2 Vision.
- **Pricing orientativo**:
  - Grok 4: ~$3 in / ~$15 out
  - Grok 3 mini: ~$0.30 in / ~$0.50 out
  - Grok Code Fast 1: ~$0.20 in / ~$1.50 out
- **Features**: API OpenAI-compatible, function calling, structured outputs, `live_search` (acceso en tiempo real a X/web), vision.
- **Política de datos**: opt-out de training disponible; default en consumer Grok es opt-in.
- **Regiones**: US principalmente.
- **Compliance**: SOC 2 en progreso (2026). Menos maduro que OpenAI/Anthropic para enterprise regulado.
- **SDKs**: usa `openai` SDK con `base_url="https://api.x.ai/v1"`.

### 2.6 Mistral AI
- **Modelos**: Mistral Large 2 (123B), Mistral Medium 3, Mistral Small 3 (24B), Codestral 25.01, Pixtral Large (VL), Ministral 3B/8B (edge), Magistral (reasoning).
- **Pricing orientativo**:
  - Large 2: ~$2 in / ~$6 out
  - Small 3: ~$0.20 in / ~$0.60 out
  - Codestral: ~$0.30 in / ~$0.90 out
- **Features**: function calling, JSON mode, structured outputs, `la-plateforme` con fine-tuning, **pesos abiertos** para Small/Ministral/Codestral (Apache 2.0).
- **Política de datos**: **empresa francesa, GDPR-first**. Datos en UE. No entrenan con prompts.
- **Regiones**: EU (Francia) por defecto; disponible también en Azure, Bedrock, Vertex.
- **Compliance**: SOC 2, ISO 27001, GDPR-nativo, EU AI Act alignment (lideran "code of practice" GPAI).
- **SDKs**: `mistralai` (Python, JS), compatible con OpenAI SDK.

### 2.7 Meta — Llama (open weights)
- **Modelos abril 2026**: Llama 3.3 70B, Llama 4 Scout (17Bx16E MoE, ~109B total), Llama 4 Maverick (17Bx128E MoE, ~400B total), Llama 4 Behemoth (anunciado).
- **No hay API oficial de Meta**. Se consume:
  - Gratis-ish: `meta.ai` (consumer).
  - API: Groq, Together, Fireworks, Replicate, SambaNova, Cerebras, Bedrock, Vertex, Azure.
- **Pricing típico en inferencia terceros**:
  - Llama 3.3 70B: ~$0.60-0.90 in / ~$0.60-0.90 out
  - Llama 4 Maverick: ~$0.20 in / ~$0.60 out (Groq/Together)
- **Licencia**: Llama Community License — permisiva salvo si tienes >700M MAU (bloquea a otros frontier labs), y debes citar "Built with Llama".
- **Features**: tool use, vision (Llama 3.2+/Llama 4), contextos 128k-10M (Scout).
- **Política de datos**: depende del host (tú eliges Groq, vLLM on-prem, etc.).

### 2.8 Groq
- **Modelos**: Llama 3.3 70B, Llama 4, Qwen3, DeepSeek-R1-Distill, Kimi K2, GPT-OSS 120B, Whisper.
- **Pricing orientativo**:
  - Llama 3.3 70B Versatile: ~$0.59 in / ~$0.79 out
  - Llama 4 Maverick: ~$0.20 in / ~$0.60 out
  - Kimi K2: ~$1 in / ~$3 out
- **Features**: >500 tok/s sostenidos, API OpenAI-compatible, tool use, JSON mode, **batch API con 50% off**, GroqCloud dedicated.
- **Política de datos**: no entrenan (no son lab). ZDR en plan enterprise.
- **Regiones**: US; EU en roadmap.
- **Compliance**: SOC 2 Type II, HIPAA-ready.
- **SDKs**: `groq` (Python, JS) + cualquier OpenAI SDK con `base_url="https://api.groq.com/openai/v1"`.

### 2.9 Together AI
- **Modelos**: >200 — Llama, Qwen, DeepSeek, Mistral, FLUX, embeddings, reranks.
- **Pricing orientativo**:
  - Llama 3.3 70B: ~$0.88 flat
  - DeepSeek-V3: ~$1.25 flat
  - Qwen3 235B: ~$0.90 in / ~$0.90 out
- **Features**: Together Inference (serverless) + **Dedicated Endpoints** (GPU reservadas, flat/hr), fine-tuning LoRA + full, JSON mode, function calling, OpenAI-compatible.
- **Política de datos**: no usan prompts para entrenar. Retention configurable. SOC 2 Type II, HIPAA.
- **Regiones**: US, EU.
- **SDKs**: `together` (Python, JS); OpenAI SDK compatible.

---

## 3. Comparativa de pricing (abril 2026) — tier por tier

> **Tip**: para datos actualizados, abre [artificialanalysis.ai/models](https://artificialanalysis.ai/models) y filtra por "Intelligence Index" vs "Price". Se actualiza semanalmente.

### 3.1 Tier "barato / alta velocidad" (chatbots, clasificación, extracción ligera)

| Modelo | Input ($/M) | Output ($/M) | Notas |
|---|---|---|---|
| Gemini 2.5 Flash-Lite | ~0.10 | ~0.40 | 1M contexto |
| GPT-5 nano | ~0.05 | ~0.40 | OpenAI floor |
| Claude Haiku 4.5 | ~1.00 | ~5.00 | Mejor calidad en tier |
| DeepSeek V3 (off-peak) | ~0.07 | ~0.27 | Imbatible en precio |
| Mistral Small 3 | ~0.20 | ~0.60 | EU-hosted |
| Llama 4 Maverick (Groq) | ~0.20 | ~0.60 | Súper rápido |

### 3.2 Tier "workhorse" (producción general)

| Modelo | Input ($/M) | Output ($/M) |
|---|---|---|
| Claude Sonnet 4.5 | ~3.00 | ~15.00 |
| GPT-5 | ~1.25 | ~10.00 |
| Gemini 2.5 Pro | ~1.25 | ~10.00 |
| Grok 4 | ~3.00 | ~15.00 |
| Mistral Large 2 | ~2.00 | ~6.00 |
| DeepSeek R1 | ~0.55 | ~2.19 |

### 3.3 Tier "reasoning / frontier"

| Modelo | Input ($/M) | Output ($/M) | Obs |
|---|---|---|---|
| Claude Opus 4.5 | ~15 | ~75 | Reasoning intensivo |
| OpenAI o3 | ~2 | ~8 | Post-ajuste 2025 |
| Gemini 2.5 Deep Think | Vertex-only | — | Enterprise |
| Grok 4 Heavy | ~$300 mo SuperGrok | — | Solo consumer tier |

**Regla heurística de diseño**: para un mismo caso de uso, los precios frontier-vs-DeepSeek difieren **10-30×**. Para un RAG de clasificación de tickets, pasar de GPT-5 a Gemini Flash-Lite o DeepSeek puede reducir factura mensual 20×. Siempre mide calidad con evals propias — el benchmark público no siempre refleja tu tarea.

---

## 4. Self-hosting y open-weights

### 4.1 Cuándo SÍ tiene sentido self-hostear

1. **Compliance estricto**: datos clínicos EHR, expedientes judiciales, secretos industriales, defensa. El BAA/DPA del proveedor no alcanza.
2. **Coste a escala**: a partir de ~50-100M tokens/día, una GPU H100/H200 dedicada amortiza vs API. Umbral empírico: si tu factura mensual > $30k, mide self-host.
3. **Latencia ultra-baja y controlada**: edge, on-device, robótica, copilots IDE con <50ms p95.
4. **Soberanía de datos extrema**: sector público europeo, gobierno, secretos de estado.
5. **Fine-tuning profundo** sobre un modelo base con lógica de dominio.
6. **Disponibilidad offline**: barcos, operaciones remotas, contingencia.

### 4.2 Cuándo NO tiene sentido (la mayoría)

- Producto con <10M tokens/día → la factura API será de centenas de dólares, no justifica MLOps ni ingenieros.
- Equipo sin experiencia GPU/Kubernetes → el TCO real (oncall, parcheo, observabilidad) te come.
- Necesitas frontier: no vas a reproducir GPT-5 ni Opus 4.5 en tu rack.
- Multimodal audio+video en tiempo real: infra muy cara.

### 4.3 Ollama — dev local

Casos: prototipado, demos offline, agentes privados para documentos internos.

Modelos que corren razonablemente bien en **MacBook M-series (unified memory)**:
- **8 GB RAM**: Llama 3.2 3B, Phi-4-mini, Qwen3 4B, Gemma 3 4B — usables.
- **16 GB RAM**: Llama 3.1 8B Q4, Mistral 7B, Qwen3 8B, Gemma 3 12B Q4 — fluidos.
- **32 GB RAM**: Llama 3.3 70B Q2/Q3 (lento pero andan), Mixtral 8x7B Q4, Qwen3 32B Q4.
- **64 GB+ RAM (M3/M4 Max)**: Llama 3.3 70B Q4/Q5, DeepSeek-R1-Distill-70B, Qwen3 72B.
- **M3 Ultra 512 GB**: puede correr DeepSeek-V3/R1 671B Q4 (~400 GB) con throughput bajo (~5-10 tok/s), demostrado en la comunidad.

**GPU consumer** (Windows/Linux):
- RTX 4070 (12 GB): hasta 13B Q4 cómodo.
- RTX 4090 (24 GB): 32B Q4 o 70B Q2.
- 2× RTX 3090 (48 GB total): 70B Q4 a buena velocidad.

### 4.4 vLLM vs TGI vs llama.cpp vs SGLang

| Motor | Uso ideal | Fortalezas | Limitaciones |
|---|---|---|---|
| **vLLM** | Producción GPU (NVIDIA/AMD) | PagedAttention, continuous batching, throughput líder, OpenAI-compatible, soporte LoRA multi-tenant | Requiere GPU decente; overhead para QPS bajo |
| **TGI** (HuggingFace) | Producción ligada a HF Hub | Integración HF, tensor parallelism, quantización AWQ/GPTQ/FP8 | Menos activo que vLLM; throughput menor en MoE |
| **llama.cpp** | CPU / laptop / edge / Apple Silicon | GGUF, Metal/CUDA/Vulkan/ROCm, binario único, embebible | No apto para concurrencia alta |
| **SGLang** | Producción MoE (DeepSeek, Qwen3 MoE) | RadixAttention, ≈vLLM o mejor en reasoning | Ecosistema más reciente |
| **TensorRT-LLM** | NVIDIA pura, latencia mínima | Kernels optimizados FP8/INT4 | Stack propietario NVIDIA |

### 4.5 Hardware mínimo (pesos FP16 / BF16)

| Tamaño | FP16 aprox | Recomendado producción | Nota |
|---|---|---|---|
| 7B | ~14 GB | 1× A10G / L4 / RTX 4090 | Barato |
| 13B | ~26 GB | 1× A100 40GB / L40S | Cómodo |
| 34B | ~68 GB | 1× A100 80GB / H100 | Ajustado |
| 70B | ~140 GB | 2× A100 80GB / 2× H100 / 1× H200 | Tensor parallel |
| MoE 400B+ (Llama 4 Maverick) | ~800 GB | 8× H100 / 8× H200 NVL | Necesitas expert parallelism |
| DeepSeek-V3/R1 671B | ~1.3 TB FP16 / ~380 GB FP8 | 8× H200 o 16× H100 | Quant FP8 obligatoria |

Con **quantización** (Q4 / AWQ / FP8) divides memoria 2-4× pero pierdes 1-3 puntos de calidad.

---

## 5. Soberanía de datos y compliance (abril 2026)

### 5.1 GDPR — estándar de hecho
- Responsable (*controller*) = tu empresa; proveedor LLM = *processor*. Necesitas **DPA firmado**.
- Transferencias UE→US cubiertas por **EU-US Data Privacy Framework** (vigente tras el reemplazo de Privacy Shield). OpenAI, Anthropic, Google están certificados.
- Retención: exige ZDR si procesas datos personales o secreto profesional.

### 5.2 EU AI Act — estado abril 2026
- **Febrero 2025**: prohibiciones (manipulación, scoring social) + obligaciones de alfabetización ya vigentes.
- **Agosto 2025**: obligaciones para **GPAI (General Purpose AI)** ya aplicables. El Code of Practice GPAI (firmado por Google, OpenAI, Anthropic, Mistral, Microsoft) es la vía de compliance. Meta se negó inicialmente.
- **Agosto 2026**: entran las obligaciones para **sistemas high-risk** (sanidad, empleo, educación, justicia, infraestructura crítica). A abril 2026 los despliegues high-risk deben **estar listos**: gestión de riesgos, transparencia, human oversight, logging, evaluación de sesgo.
- **Agosto 2027**: resto de obligaciones high-risk plenas.
- Implicación práctica para el arquitecto: si tu app cae en Anexo III (ej. CV screening, scoring educativo), necesitas conformidad CE, FRIA (Fundamental Rights Impact Assessment), registro en base UE.

### 5.3 Data residency y BAAs
- **HIPAA (salud US)**: BAA disponible en AWS Bedrock, Azure OpenAI, Google Vertex, Anthropic directo (enterprise), OpenAI directo (enterprise).
- **SOC 2 Type II**: lo tienen todos los tier-1. Pide siempre el reporte.
- **ISO 27001 / 27701 / 42001**: 42001 es el nuevo estándar específico de AI management systems; Anthropic, Google y Microsoft lo tienen.
- **FedRAMP**: Azure OpenAI GCC High, Bedrock GovCloud, Vertex con controles adicionales.

### 5.4 Limitaciones geográficas
- **China**: modelos chinos (DeepSeek, Qwen, Kimi) hospedados en China continental están sujetos a **censura de contenido político**, obligación de registro ante CAC y cooperación con autoridades. Nunca envíes datos sensibles a APIs hospedadas en China.
- **Rusia / Irán / Corea del Norte / Cuba**: sanciones OFAC — OpenAI, Anthropic, Google bloquean. Grok también.
- **UE**: exige data residency si procesas datos de funcionarios públicos o sectores regulados.
- **Brasil LGPD, México LFPDPPP, Perú Ley 29733**: requieren DPA equivalente; todos los tier-1 US lo ofrecen.

---

## 6. Criterios de elección de proveedor

Evalúa cada caso por estas seis dimensiones. Raramente un proveedor gana en todas.

1. **Intelligence-per-dollar** — usa artificialanalysis.ai. A abril 2026, **Gemini 2.5 Flash y DeepSeek V3** dominan el pareto coste/calidad para tareas generales; **Claude Sonnet 4.5 y GPT-5** ganan en razonamiento complejo.
2. **Latencia** — Groq, Cerebras, SambaNova. Para voice agents, IDE copilots, trading. TTFT <200ms y >500 tok/s.
3. **Privacidad** — descendente: local on-prem > hyperscaler con ZDR > API directa con ZDR > API directa estándar > consumer products.
4. **Robustez / SLA** — los hyperscalers ofrecen 99.9% en SLA contractual. APIs directas: 99.5% típico, muchas veces sin crédito por incidente.
5. **Lock-in** — APIs **OpenAI-compatible** (DeepSeek, xAI, Groq, Together, Fireworks, Mistral, vLLM, Ollama) son intercambiables con cambio de `base_url`. APIs propietarias (Anthropic messages, Gemini, Bedrock Converse) requieren abstracción.
6. **Features diferenciales**:
   - **MCP**: Anthropic nativo, OpenAI lo adoptó 2025, Google en roadmap, cualquiera vía proxy.
   - **Tool use robusto**: Claude, GPT-5, Gemini.
   - **Vision**: todos los frontier + Pixtral, Qwen-VL, Llama 4.
   - **Audio/Realtime**: OpenAI Realtime, Gemini Live, ElevenLabs.
   - **Contexto 1M+**: Gemini 2.5 Pro, Claude Sonnet (tier enterprise), Kimi K2, Llama 4 Scout.

---

## 7. Estrategias multi-provider

### 7.1 Por qué multi-provider es casi obligatorio en 2026
- **Outages reales**: OpenAI tuvo incidentes notables en 2024-2025; Anthropic también. Depender de uno = riesgo de negocio.
- **Rate limits**: en picos no podrás escalar solo con tu proveedor.
- **Evolución de precio**: en 18 meses el "mejor por dólar" cambia 3-4 veces. Quieres cambiar sin reescribir.
- **Regulación**: si UE te obliga a data residency, necesitas fallback EU sin romper el código.

### 7.2 Patrones

**Abstracción agnóstica (capa de código)**
- **LiteLLM** (Python) — proxy open-source que unifica 100+ proveedores a formato OpenAI. Puedes correrlo como librería o como gateway HTTP con routing, fallback, budget guards, logs, PII masking.
- **OpenRouter** — SaaS que agrega >300 modelos detrás de una API OpenAI-compatible. Útil para prototipar y comparar; margen ~5% sobre el proveedor base.
- **Portkey** — AI Gateway enterprise: caching semántico, guardrails, observabilidad, multi-cloud routing, virtual keys.
- **Helicone** — observabilidad + gateway.

**Fallback por outage**
```python
# pseudocódigo
try:
    resp = await call(provider="anthropic", model="sonnet-4.5", ...)
except (RateLimit, ServerError, Timeout):
    resp = await call(provider="bedrock", model="claude-sonnet-4.5-v2", ...)
```

**Routing por coste/calidad**
- Clasificas el mensaje (router pequeño / heurística): preguntas triviales → Haiku/Flash-Lite; complejas → Sonnet/GPT-5; razonamiento → o3/Opus.
- Ahorros de 40-70% típicos vs. "todo a Sonnet".

**Ejemplo del proyecto `peru-elecciones`**
El proyecto referencia usa DeepSeek vía API OpenAI-compatible. Código:
```python
from openai import OpenAI
client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)
```
Cambiar a Groq para baja latencia = cambiar dos líneas:
```python
client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)
```
Esto es lo que hace que **OpenAI-compatible** sea el "TCP/IP" de facto del ecosistema LLM a abril 2026.

### 7.3 Proxies y gateways — cuándo usar cuál
- **Solo dev / prototipo / comparar modelos**: OpenRouter.
- **Producción con control fino**: LiteLLM (self-host) o Portkey.
- **Enterprise con compliance**: Portkey, Helicone, o un gateway propio detrás de tu VPC.
- **Observabilidad pura**: Langfuse, Helicone, Braintrust (no enrutan, solo miden).

---

## 8. Resumen ejecutivo para la clase

1. El mercado 2026 es **multi-polar**: frontier US (Anthropic, OpenAI, Google), frontier chino a 1/10 del precio (DeepSeek, Qwen), open weights serios (Llama, Mistral), inferencia especializada (Groq, Cerebras).
2. **Nadie es "el mejor"**: eligen por intelligence-per-dollar + privacidad + latencia + features.
3. La **API OpenAI-compatible** es el estándar de facto → diseña tu capa de modelo como **pluggable desde el día 1** (LiteLLM o abstracción propia).
4. **MCP** (Model Context Protocol) se está imponiendo como estándar de tooling; enséñalo.
5. **Self-host solo cuando los números lo pidan** (compliance estricto o >$30-50k/mes de factura API).
6. **Verificar pricing siempre**: artificialanalysis.ai + pricing pages oficiales. Este dossier caduca rápido.

---

## Fuentes

### Pricing y docs oficiales
- Anthropic pricing — https://www.anthropic.com/pricing
- Anthropic API docs — https://docs.anthropic.com
- OpenAI pricing — https://openai.com/api/pricing
- OpenAI docs — https://platform.openai.com/docs
- Google Gemini pricing — https://ai.google.dev/gemini-api/docs/pricing
- Vertex AI pricing — https://cloud.google.com/vertex-ai/generative-ai/pricing
- DeepSeek pricing — https://api-docs.deepseek.com/quick_start/pricing
- xAI docs / pricing — https://docs.x.ai/docs/models
- Mistral pricing — https://mistral.ai/technology/#pricing
- Meta Llama — https://www.llama.com/
- Groq pricing — https://groq.com/pricing
- Together pricing — https://www.together.ai/pricing
- Fireworks pricing — https://fireworks.ai/pricing
- Cerebras — https://cloud.cerebras.ai
- SambaNova Cloud — https://cloud.sambanova.ai
- AWS Bedrock pricing — https://aws.amazon.com/bedrock/pricing/
- Azure AI Foundry pricing — https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/
- Qwen — https://qwenlm.github.io
- Zhipu GLM — https://open.bigmodel.cn
- Moonshot Kimi — https://platform.moonshot.cn

### Comparativas independientes y benchmarks
- Artificial Analysis — https://artificialanalysis.ai
- LM Arena (antes Chatbot Arena) — https://lmarena.ai
- Aider LLM leaderboard — https://aider.chat/docs/leaderboards/
- LiveBench — https://livebench.ai
- SWE-bench — https://www.swebench.com
- HELM (Stanford) — https://crfm.stanford.edu/helm/

### Herramientas multi-provider / proxies
- LiteLLM — https://docs.litellm.ai
- OpenRouter — https://openrouter.ai
- Portkey — https://portkey.ai
- Helicone — https://helicone.ai
- Langfuse — https://langfuse.com

### Self-hosting
- Ollama — https://ollama.com
- vLLM — https://docs.vllm.ai
- llama.cpp — https://github.com/ggml-org/llama.cpp
- HuggingFace TGI — https://github.com/huggingface/text-generation-inference
- SGLang — https://github.com/sgl-project/sglang
- LM Studio — https://lmstudio.ai

### Compliance y regulación
- EU AI Act texto oficial — https://artificialintelligenceact.eu
- Comisión Europea — AI Act — https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai
- Code of Practice for GPAI — https://digital-strategy.ec.europa.eu/en/library/third-draft-general-purpose-ai-code-practice-published-written-independent-experts
- EU-US Data Privacy Framework — https://www.dataprivacyframework.gov
- ISO/IEC 42001 — https://www.iso.org/standard/81230.html
- MCP spec — https://modelcontextprotocol.io
