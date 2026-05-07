# Bibliografía y referencias — Clase 1: "Arquitectura IA Generativa y el Ecosistema LLM"

> Lista curada y organizada para preparar, impartir y extender la clase. Las URLs de arXiv son identificadores permanentes; verifica las páginas comerciales/cursos el día de la clase.

---

## 1. Papers fundacionales

- **Vaswani et al. 2017 — "Attention Is All You Need"** — https://arxiv.org/abs/1706.03762 — Paper original del Transformer; establece la arquitectura base de todos los LLMs modernos.
- **Brown et al. 2020 — "Language Models are Few-Shot Learners" (GPT-3)** — https://arxiv.org/abs/2005.14165 — Demuestra que el scaling habilita aprendizaje en contexto (in-context learning) sin fine-tuning.
- **Bommasani et al. 2021 — "On the Opportunities and Risks of Foundation Models"** — https://arxiv.org/abs/2108.07258 — Reporte de Stanford CRFM que acuña el término "foundation models" y mapea riesgos sistémicos.
- **Kaplan et al. 2020 — "Scaling Laws for Neural Language Models"** — https://arxiv.org/abs/2001.08361 — Ley de escalado original: loss decrece como power-law en cómputo, datos y parámetros.
- **Hoffmann et al. 2022 — "Training Compute-Optimal Large Language Models" (Chinchilla)** — https://arxiv.org/abs/2203.15556 — Corrige a Kaplan: para un compute dado, datos y parámetros deben escalar en proporciones similares (~20 tokens por parámetro).
- **Wei et al. 2022 — "Chain-of-Thought Prompting Elicits Reasoning"** — https://arxiv.org/abs/2201.11903 — Mostrar cadenas de razonamiento en el prompt mejora drásticamente tareas multi-paso.
- **Wei et al. 2022 — "Emergent Abilities of Large Language Models"** — https://arxiv.org/abs/2206.07682 — Ciertas capacidades aparecen bruscamente al pasar un umbral de escala (cuestionado después por Schaeffer 2023).
- **Schaeffer et al. 2023 — "Are Emergent Abilities of LLMs a Mirage?"** — https://arxiv.org/abs/2304.15004 — Matiza el hallazgo anterior: las emergencias dependen de la métrica elegida.
- **Liu et al. 2023 — "Lost in the Middle: How Language Models Use Long Contexts"** — https://arxiv.org/abs/2307.03172 — Los LLMs atienden mejor al inicio y final del contexto; crítico para diseño de prompts largos y RAG.
- **Ouyang et al. 2022 — "Training Language Models to Follow Instructions with Human Feedback" (InstructGPT)** — https://arxiv.org/abs/2203.02155 — Introduce el pipeline RLHF (SFT → Reward Model → PPO) que funda ChatGPT.
- **Bai et al. 2022 — "Constitutional AI: Harmlessness from AI Feedback"** — https://arxiv.org/abs/2212.08073 — Anthropic propone RLAIF: la IA se autoevalúa contra una "constitución".
- **Rafailov et al. 2023 — "Direct Preference Optimization"** — https://arxiv.org/abs/2305.18290 — DPO elimina el reward model: optimiza preferencias directamente, simplificando RLHF.
- **DeepSeek-AI 2025 — "DeepSeek-R1"** — https://arxiv.org/abs/2501.12948 — Modelo open-weights que iguala a o1 en razonamiento usando RL puro (GRPO) sin SFT previo.
- **DeepSeek-V3** — https://arxiv.org/abs/2412.19437 — MoE 671B (37B activos), entrenado por una fracción del coste típico.
- **Snell et al. 2024 — "Scaling LLM Test-Time Compute Optimally..."** — https://arxiv.org/abs/2408.03314 — Evidencia empírica de que, por FLOP, gastar más en inferencia puede superar gastar más en entrenamiento.
- **Muennighoff et al. 2025 — "s1: Simple test-time scaling"** — https://arxiv.org/abs/2501.19393 — Lectura complementaria sobre test-time compute.
- **Dao et al. 2022 — FlashAttention** — https://arxiv.org/abs/2205.14135 — Optimización clave que hizo viables contextos largos.

---

## 2. Documentación oficial de proveedores

- **Anthropic (Claude API)** — https://docs.anthropic.com — Messages API, tool use, prompt caching, extended thinking, MCP, Agent SDK.
- **OpenAI Platform** — https://platform.openai.com/docs — Responses API, Assistants, Realtime, Structured Outputs, fine-tuning y evals.
- **Google Gemini API** — https://ai.google.dev/gemini-api/docs — Gemini 2.x, long-context (1M+ tokens), grounding con Google Search, multimodal nativo.
- **DeepSeek API** — https://api-docs.deepseek.com — Compatible con OpenAI; V3 y R1 con pricing muy bajo.
- **xAI (Grok)** — https://docs.x.ai — API compatible con OpenAI; modelos Grok-3/4 con acceso real-time a X.
- **Mistral AI** — https://docs.mistral.ai — Mistral Large, Codestral, Pixtral; "La Plateforme".
- **Meta Llama** — https://www.llama.com/docs/overview/ — Descarga de pesos, licencia, model cards.
- **Ollama** — https://ollama.com / https://github.com/ollama/ollama — Runtime local; API HTTP parcial OpenAI.
- **vLLM** — https://docs.vllm.ai — Servidor de inferencia de alto throughput; estándar de facto OSS.
- **Hugging Face Inference / Transformers** — https://huggingface.co/docs — Hub de modelos, `transformers`, Inference Endpoints, TGI.

---

## 3. Documentación de frameworks de aplicación

- **LangChain** — https://python.langchain.com/docs/
- **LangGraph** — https://langchain-ai.github.io/langgraph/ — Framework de agentes como grafos con estado.
- **LangSmith** — https://docs.smith.langchain.com — Observabilidad, evaluación y datasets.
- **LlamaIndex** — https://docs.llamaindex.ai — RAG y data framework.
- **Semantic Kernel (Microsoft)** — https://learn.microsoft.com/semantic-kernel/
- **Haystack (deepset)** — https://docs.haystack.deepset.ai
- **Pydantic AI** — https://ai.pydantic.dev — Agentes tipados con Pydantic.
- **Instructor** — https://python.useinstructor.com — Structured outputs multi-provider.
- **DSPy** — https://dspy.ai — "Programar, no promptear".
- **Vercel AI SDK** — https://ai-sdk.dev — SDK TypeScript multi-proveedor.
- **Model Context Protocol (MCP)** — https://modelcontextprotocol.io — Estándar abierto (Anthropic, adoptado por OpenAI, Google, Microsoft).
- **Anthropic Agent SDK** — https://docs.claude.com/en/api/agent-sdk/overview
- **LiteLLM** — https://docs.litellm.ai — Proxy unificado (100+ proveedores detrás de schema OpenAI).

---

## 4. Cursos y libros

### Cursos
- **DeepLearning.AI short courses** — https://www.deeplearning.ai/short-courses/ — Catálogo gratuito: "ChatGPT Prompt Engineering for Developers", "LangChain for LLM App Dev", "Building Systems with the ChatGPT API", "Functions, Tools and Agents with LangChain", "Building and Evaluating Advanced RAG".
- **Andrej Karpathy — "Neural Networks: Zero to Hero"** — https://karpathy.ai/zero-to-hero.html — Construye un transformer desde cero (nanoGPT). Imprescindible.
- **Karpathy — "Intro to Large Language Models" (1h talk)** — https://www.youtube.com/watch?v=zjkBMFhNj_g — Panorámica pedagógica de todo el stack.
- **Hugging Face NLP / LLM Course** — https://huggingface.co/learn/llm-course — Desde tokenización hasta fine-tuning.
- **Hugging Face Agents Course** — https://huggingface.co/learn/agents-course — Curso 2025 con smolagents, LangGraph y LlamaIndex.
- **Microsoft "Generative AI for Beginners"** — https://github.com/microsoft/generative-ai-for-beginners — 21 lecciones open-source.
- **Microsoft "AI Agents for Beginners"** — https://github.com/microsoft/ai-agents-for-beginners
- **Google Cloud Generative AI Learning Path** — https://www.cloudskillsboost.google/paths/118

### Libros
- **Chip Huyen — "AI Engineering" (O'Reilly, 2024-2025)** — https://huyenchip.com/books/ — Referencia clave: foundation models, evals, RAG, agentes, costos.
- **Jay Alammar & Maarten Grootendorst — "Hands-On Large Language Models" (O'Reilly, 2024)** — https://www.oreilly.com/library/view/hands-on-large-language/9781098150952/ — Muy visual.
- **Paul Iusztin & Maxime Labonne — "LLM Engineer's Handbook" (Packt, 2024)** — End-to-end: datasets, SFT, DPO, deployment.
- **Louis-François Bouchard & Louie Peters — "Building LLMs for Production" (Towards AI, 2024)** — Fiabilidad, fine-tuning, vector DBs.
- **Sebastian Raschka — "Build a Large Language Model (From Scratch)" (Manning, 2024)** — https://www.manning.com/books/build-a-large-language-model-from-scratch — Complemento escrito a Karpathy.

---

## 5. Blogs y newsletters de referencia

- **Simon Willison** — https://simonwillison.net — El mejor tracker diario del ecosistema. Tag `llms`.
- **Chip Huyen** — https://huyenchip.com/blog/ — Ensayos largos sobre arquitectura, evals y economía de LLMs.
- **Hamel Husain** — https://hamel.dev — Práctica de evals, fine-tuning, "Your AI Product Needs Evals", "Fuck you, show me the prompt".
- **Eugene Yan** — https://eugeneyan.com — Patrones de sistemas ML/LLM en producción.
- **Lilian Weng** — https://lilianweng.github.io — Surveys técnicos profundos (agents, hallucinations, RL).
- **Jay Alammar** — https://jalammar.github.io — "The Illustrated Transformer" (https://jalammar.github.io/illustrated-transformer/).
- **Sebastian Raschka — "Ahead of AI"** — https://magazine.sebastianraschka.com
- **Latent Space (swyx & Alessio)** — https://www.latent.space — Newsletter + podcast.
- **The Batch (DeepLearning.AI)** — https://www.deeplearning.ai/the-batch/
- **Import AI (Jack Clark)** — https://importai.substack.com — Policy + técnica.
- **Interconnects (Nathan Lambert)** — https://www.interconnects.ai — Post-training, RLHF, modelos open.
- **Anthropic Engineering / Research** — https://www.anthropic.com/engineering y https://www.anthropic.com/research — "Building effective agents" (dic 2024) es lectura obligada.
- **OpenAI Cookbook** — https://cookbook.openai.com — Recetas oficiales.

---

## 6. Rankings y benchmarks

- **LMArena (Chatbot Arena)** — https://lmarena.ai — Ranking por voto humano ciego pareado.
- **Artificial Analysis** — https://artificialanalysis.ai — Calidad, precio, latencia, throughput por proveedor.
- **Hugging Face Open LLM Leaderboard v2** — https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard
- **SWE-bench / SWE-bench Verified** — https://www.swebench.com — Benchmark de referencia para agentes de código.
- **LiveBench** — https://livebench.ai — Contaminación-resistente (preguntas refrescadas mensualmente).
- **HELM (Stanford CRFM)** — https://crfm.stanford.edu/helm/
- **ARC-AGI** — https://arcprize.org/
- **GAIA** — https://huggingface.co/gaia-benchmark — Benchmark de asistentes generales / agentes.
- **Terminal-Bench / OSWorld** — https://www.tbench.ai/ — Agentes que operan terminales y escritorios.
- **Humanity's Last Exam** — https://agi.safe.ai/

---

## 7. Herramientas útiles

- **tiktoken (OpenAI)** — https://github.com/openai/tiktoken — Tokenizador BPE.
- **Anthropic token counting** — https://docs.anthropic.com/en/docs/build-with-claude/token-counting
- **Hugging Face `tokenizers`** — https://github.com/huggingface/tokenizers
- **Tiktokenizer (web)** — https://tiktokenizer.vercel.app — Visualiza tokenización.
- **OpenRouter** — https://openrouter.ai — 200+ modelos detrás de una API.
- **Poe** — https://poe.com — Playground multi-modelo.
- **LM Studio** — https://lmstudio.ai — GUI desktop para GGUF/MLX.
- **Ollama** — https://ollama.com — CLI + servidor local.
- **LiteLLM** — https://docs.litellm.ai
- **Langfuse** — https://langfuse.com — Observabilidad OSS.
- **Helicone** — https://helicone.ai — Observabilidad + caching.
- **Playgrounds oficiales**: Anthropic Console (https://console.anthropic.com), OpenAI Playground (https://platform.openai.com/playground), Google AI Studio (https://aistudio.google.com), Mistral "Le Chat" (https://chat.mistral.ai).

---

## 8. Proyectos de referencia del curso

- **educa-AI-Platforms** (proyecto interno) — Plataforma EdTech con orquestación LLM, chat multi-turn, streaming SSE, exports y rate limiting. Fuente de ejemplos prácticos para las clases 3-5.
- **peru-elecciones** (proyecto interno) — Go + DeepSeek vía API compatible-OpenAI, contexto inyectado desde SQLite sin RAG. Caso "minimal viable LLM app" que ilustra que no todo problema requiere vector DB.
- **yana-killa-demo** (proyecto interno) — FastAPI + TanStack Start, RAG híbrido BM25+vector, LiteLLM, SSE, citas verificables. Caso de estudio principal de Clase 4 y stack de la Clase 5.

Referencias externas comparables:
- **LangChain `open_deep_research`** — https://github.com/langchain-ai/open_deep_research
- **Anthropic "Building effective agents" code** — https://github.com/anthropics/anthropic-cookbook — Patrones canónicos (prompt chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer).
- **OpenAI Agents SDK** — https://github.com/openai/openai-agents-python

---

## 9. Comunidades

- **r/LocalLLaMA** — https://www.reddit.com/r/LocalLLaMA/ — Modelos open-weight, quantización, hardware.
- **Hugging Face Discord** — https://hf.co/join/discord
- **Anthropic Discord (Claude Developers)** — https://www.anthropic.com/discord
- **OpenAI Developer Community Forum** — https://community.openai.com
- **LangChain Discord** — https://discord.gg/langchain
- **EleutherAI Discord** — https://discord.gg/eleutherai — Research.

**Twitter/X recomendados**:
- @karpathy — fundamentos, explicaciones.
- @swyx — swyx / Latent Space.
- @simonw — Simon Willison (daily digest).
- @ShayneRedford — Shayne Longpre (AI evaluation, datasets).
- @hwchase17 — Harrison Chase (LangChain).
- @jerryjliu0 — Jerry Liu (LlamaIndex).
- @hamelhusain — Hamel Husain.
- @chipro — Chip Huyen.
- @lilianweng, @rasbt.
- @AnthropicAI, @OpenAI, @GoogleDeepMind — cuentas oficiales.

---

## Notas metodológicas para la clase

1. **URLs "ancla" para proyectar**: `arxiv.org/abs/1706.03762` (Transformer), `huyenchip.com/books/` (AI Engineering), `lmarena.ai` (benchmark vivo), `docs.anthropic.com` + `platform.openai.com/docs` (docs), y `modelcontextprotocol.io` (protocolo emergente).
2. **Tres arcos narrativos** para los papers: **arquitectura** (Vaswani), **escala** (Kaplan → Chinchilla → Emergent Abilities), **alineamiento y razonamiento** (InstructGPT → Constitutional AI → DPO → DeepSeek-R1 → Test-time compute).
3. **Tareas post-clase sugeridas**: Karpathy "Intro to LLMs" (1h) + capítulos 1-2 de Chip Huyen "AI Engineering" + explorar LMArena y Artificial Analysis en vivo.
