# Bloque 1 — Fundamentos de IA Generativa y modelos fundacionales

> Dossier para la **Clase 1** del curso *Arquitectura de Aplicaciones con IA Generativa* (EscuelaIT, abril 2026). Nivel: desarrolladores intermedio-avanzados.
>
> **Nota metodológica:** datos volátiles (nombres, versiones y fechas de modelos frontier Q1 2026) marcados con ⚠️ deben contrastarse contra las fuentes oficiales listadas al final antes de la clase.

---

## 1. Qué es un LLM / modelo fundacional

Un **Large Language Model (LLM)** es una red neuronal profunda —casi siempre basada en la arquitectura Transformer— entrenada sobre corpus masivos de texto (y cada vez más, multimodales) con un objetivo autosupervisado, típicamente la **predicción del siguiente token**. El resultado es un sistema que modela la distribución `P(token_n | token_1, …, token_{n-1})` y que, al muestrearse autoregresivamente, genera texto coherente. Lo distintivo es la **escala**: miles de millones (o billones) de parámetros, decenas de terabytes de datos, órdenes de magnitud más cómputo que modelos ML previos.

La diferencia con el **ML "clásico"** es cualitativa, no solo cuantitativa:

- **Clásico:** un modelo = una tarea. SVM para spam, XGBoost para fraude, CRF para POS-tagging. Cada uno requiere features diseñadas y etiquetas específicas.
- **LLM / fundacional:** **un solo modelo pre-entrenado** resuelve cientos de tareas sin reentrenamiento, vía prompting o fine-tuning ligero. La tarea se especifica en lenguaje natural.
- **Clásico:** rendimiento se satura al añadir datos.
- **LLM:** rendimiento sigue leyes de escala y aparecen **capacidades emergentes** a ciertos umbrales.

El término **"modelo fundacional"** (*foundation model*) fue acuñado por el **Stanford CRFM** (Center for Research on Foundation Models) en **Bommasani et al. (2021), "On the Opportunities and Risks of Foundation Models"**. La tesis: son modelos entrenados sobre datos amplios a gran escala y **adaptables a un rango amplio de tareas downstream**. Lo "fundacional" no es el tamaño, sino el rol arquitectónico: son los *cimientos* sobre los que se construyen aplicaciones. Incluye LLMs (GPT, Claude, Gemini, Llama), pero también modelos de visión (CLIP, SAM), multimodales, código (Codex) y científicos (AlphaFold).

Para el desarrollador, la implicación práctica es que **ya no entrena modelos**: los consume como capa de infraestructura (API, endpoints de inferencia, pesos abiertos) y construye la aplicación *alrededor* del modelo (prompts, RAG, tooling, evaluación). Todo el curso se articula sobre esta premisa.

**Fuentes:**
- Bommasani et al., "On the Opportunities and Risks of Foundation Models" — https://arxiv.org/abs/2108.07258
- Stanford CRFM — https://crfm.stanford.edu/

---

## 2. Arquitectura Transformer a alto nivel

**"Attention Is All You Need"** (Vaswani et al., NeurIPS 2017) introdujo el Transformer, que desplazó a RNN/LSTM como estándar para modelado de secuencias. Para un dev intermedio-avanzado, la idea mínima viable se reduce a tres conceptos:

1. **Tokenización.** El texto se parte en tokens (subpalabras vía BPE o SentencePiece). Cada token se mapea a un vector (embedding) de 4K-12K dimensiones en modelos modernos.
2. **Self-attention.** Dado un token, el modelo calcula cuánta "atención" prestar a cada otro token del contexto: `softmax(QK^T / √d) · V`, con Q, K, V proyecciones lineales del embedding. Clave: **todas las posiciones se procesan en paralelo**, a diferencia de una RNN. Paralelizable en GPU → entrenable a gran escala.
3. **Autoregresivo (decoder-only).** Los LLMs modernos (GPT, Claude, Llama, Gemini) son decoder-only con máscara causal: cada token solo atiende a los previos. En inferencia, el modelo predice el siguiente token, lo concatena, y repite. Esto es el *streaming* que vemos en chatbots.

**Analogía para la clase:** *el Transformer es una mesa redonda donde cada palabra escucha a todas las demás antes de hablar*. Al generar la siguiente palabra, "mira" a todas las anteriores a la vez, pesa cuáles importan, y vota. Una RNN sería un teléfono escacharrado: la información pasa de vecino en vecino y se degrada.

**Por qué escaló:**
- **Paralelismo:** cómputo `O(n²)` en secuencia pero totalmente paralelo; explota GPUs/TPUs de forma óptima.
- **Sin cuellos de botella recurrentes:** gradientes fluyen mejor, entrenamientos estables.
- **Uniformidad:** el mismo bloque (attention + FFN + normalización) se apila 30-100 veces. Ingeniería simple → fácil de escalar.
- **Leyes de escala favorables** (Kaplan 2020, Chinchilla 2022): la calidad sube predeciblemente con cómputo.

Extensiones vigentes en abril 2026: **Mixture of Experts (MoE)** para escalar parámetros sin escalar cómputo por token (DeepSeek V3, Mixtral, se presume en GPT-4/5); **atención eficiente** (FlashAttention 2/3, sliding window, sparse) para contextos largos; **State-Space Models** tipo Mamba como alternativa híbrida (aún minoritarios en frontier).

**Fuentes:**
- Vaswani et al., "Attention Is All You Need" — https://arxiv.org/abs/1706.03762
- "The Illustrated Transformer" (Jay Alammar) — https://jalammar.github.io/illustrated-transformer/
- "The Annotated Transformer" (Harvard NLP) — https://nlp.seas.harvard.edu/annotated-transformer/
- FlashAttention — https://arxiv.org/abs/2205.14135

---

## 3. Pre-training, post-training y alineamiento

El ciclo de vida de un LLM moderno tiene **tres fases**. Entenderlas explica *por qué* el modelo se comporta como lo hace —y por qué a veces falla de formas raras.

### 3.1 Pre-training
- **Objetivo:** next-token prediction sobre corpus masivo (típicamente 10-30T tokens en modelos frontier 2025-2026).
- **Datos:** web crawl filtrado (Common Crawl), libros, código (GitHub), papers, Wikipedia, y cada vez más **datos sintéticos** generados por modelos previos.
- **Coste:** decenas a cientos de millones USD para modelos frontier. GPT-4 estimado ~$100M; frontier 2025-2026 más. ⚠️ verificar cifras exactas.
- **Resultado:** un *base model* que completa texto, pero **no sabe seguir instrucciones**. Si le preguntas "¿cuál es la capital de Francia?", puede responder con más preguntas porque eso es lo estadísticamente frecuente en sus datos.

### 3.2 Post-training: SFT (Supervised Fine-Tuning)
Humanos (o modelos fuertes) producen ejemplos `(instrucción, respuesta_ideal)`. Se fine-tunea el base model con cross-entropy. Resultado: un *instruct model* que ya sigue el patrón pregunta-respuesta. Este fue el salto de GPT-3 a InstructGPT/ChatGPT.

### 3.3 Post-training: preferencias humanas
- **RLHF (Reinforcement Learning from Human Feedback):** Ouyang et al. 2022 (InstructGPT). Se entrena un *reward model* sobre rankings humanos `A > B` y se optimiza el LLM con PPO contra ese reward. Funciona pero es costoso, inestable y propenso a *reward hacking*.
- **DPO (Direct Preference Optimization):** Rafailov et al. 2023. Elimina el reward model explícito y el loop de RL; optimiza directamente una loss matemáticamente equivalente. Más simple y estable. Muy usado desde 2024.
- **Constitutional AI (CAI):** Anthropic, Bai et al. 2022. El modelo se critica y reescribe a sí mismo siguiendo una "constitución" de principios. Reduce dependencia de etiquetadores humanos. Técnica distintiva de Claude.
- **RLAIF / RLVR (verifiable rewards):** en dominios donde la corrección es objetiva (código que compila, mates que verifican), el reward viene del entorno. Es la clave de los razonadores modernos (o-series, R1, Claude *extended thinking*).

### 3.4 Por qué le importa al desarrollador
El post-training explica comportamientos que el dev encuentra en producción:
- **Sycophancy** (el modelo te da la razón aunque estés equivocado): artefacto de RLHF optimizando "respuesta que le gusta al rater".
- **Rechazos excesivos** ("no puedo ayudarte con eso"): exceso de RLHF de seguridad.
- **Verbosidad y formato markdown:** RLHF premia respuestas largas y estructuradas.
- **Capacidades latentes:** el modelo sabe cosas del pre-training pero solo expone las que el post-training activa. Por eso técnicas como *many-shot* o jailbreaking pueden extraer capacidades.

**Fuentes:**
- Ouyang et al., InstructGPT — https://arxiv.org/abs/2203.02155
- Rafailov et al., DPO — https://arxiv.org/abs/2305.18290
- Bai et al., Constitutional AI — https://arxiv.org/abs/2212.08073
- Anthropic, "Core Views on AI Safety" — https://www.anthropic.com/news/core-views-on-ai-safety

---

## 4. Capacidades emergentes y sus límites

### 4.1 Qué es una capacidad emergente
Wei et al. (2022), "Emergent Abilities of Large Language Models", popularizó la idea de que ciertas capacidades **aparecen abruptamente a partir de cierta escala**. Ejemplos:
- **In-context learning (ICL) / few-shot prompting:** el modelo aprende una tarea solo con ejemplos en el prompt, sin actualizar pesos. Emergió en GPT-3 (Brown et al. 2020).
- **Chain-of-thought (CoT):** Wei et al. 2022. Pedirle "think step by step" mejora drásticamente matemáticas y razonamiento. Es la base conceptual de los razonadores actuales.
- **Instruction following generalizado** a tareas no vistas.
- **Code generation y debugging.**
- **Translation zero-shot.**

**Caveat:** Schaeffer et al. 2023, "Are Emergent Abilities of Large Language Models a Mirage?" argumenta que muchas "emergencias" son artefactos de métricas discontinuas (exact match vs. log-probability). El fenómeno existe pero es menos mágico.

### 4.2 Límites duros (abril 2026)
Cosas que los LLMs **siguen haciendo mal** y que el dev debe tener presentes al diseñar arquitectura:

1. **Alucinación:** genera información plausible pero falsa con alta confianza. Causa: el objetivo es *plausibilidad*, no *verdad*. Mitigación → RAG, tool use, citations.
2. **Conocimiento congelado (training cutoff):** no sabe lo ocurrido tras su fecha de corte. Mitigación → tool use (búsqueda), RAG.
3. **Aritmética exacta y cálculo simbólico:** incluso modelos frontier fallan en multiplicaciones de 8 dígitos. Mitigación → code interpreter, calculadora como tool.
4. **Consistencia de estado a largo plazo:** en conversaciones largas o tareas con muchos pasos, el modelo se contradice. Mitigación → memoria explícita, compactación, agentes con scratchpad.
5. **Razonamiento fuera de distribución:** fallan en puzzles estructuralmente novedosos (ARC-AGI). Los razonadores han mejorado mucho, pero no es nivel-humano general.
6. **Causalidad y planificación profunda:** correlación sí, causalidad débil.
7. **Auto-conocimiento calibrado:** no sabe bien qué sabe y qué no; por eso alucina sin avisar.

**Fuentes:**
- Brown et al., GPT-3 — https://arxiv.org/abs/2005.14165
- Wei et al., Emergent Abilities — https://arxiv.org/abs/2206.07682
- Wei et al., Chain-of-Thought — https://arxiv.org/abs/2201.11903
- Schaeffer et al., "A Mirage?" — https://arxiv.org/abs/2304.15004

---

## 5. Panorama de modelos frontier (abril 2026)

> ⚠️ **Sección volátil.** Verificar cada dato en release notes oficiales antes de la clase.

### 5.1 Anthropic — familia Claude 4.x
- **Claude Opus 4.7:** tier superior de Anthropic. Se posiciona como el modelo más fuerte en *agentic coding*, razonamiento y tareas de largo horizonte. Soporta *extended thinking* configurable por token budget. Ventana de contexto hasta **1M tokens** en API para clientes selectos (heredada de la línea Sonnet 4 de 2025). ⚠️ verificar parámetros (Anthropic no los publica) y fecha exacta de release.
- **Claude Sonnet 4.6:** punto óptimo precio/rendimiento, caballo de batalla en producción. Fuerte en coding (SWE-bench), tool use y visión.
- **Claude Haiku 4.5:** tier rápido y barato, multimodal, diseñado para latencia baja y agentes de alta frecuencia.
- **Modalidades:** texto, visión (imágenes, PDFs, diagramas). Audio/video no son nativos de producción a abril 2026 ⚠️.
- **Diferenciadores:** Constitutional AI, extended thinking, ventanas 200K-1M, énfasis en seguridad y steerability, API de **tool use** muy madura, **computer use** (agente operando pantallas) desde Sonnet 3.5.

**Fuentes:** https://docs.anthropic.com/en/docs/about-claude/models · https://www.anthropic.com/news · https://docs.anthropic.com/en/release-notes/overview

### 5.2 OpenAI — GPT-5 y o-series
- **GPT-5** (lanzado 2025, ⚠️ verificar fecha): unificación de la línea GPT con razonamiento integrado (router interno que decide cuánto "pensar"). Contexto 256K-400K tokens. Multimodal nativo (texto, visión, audio vía Realtime API).
- **GPT-4o / GPT-4.1:** generación previa, aún muy usada por precio/latencia. GPT-4o introdujo voz-a-voz tiempo real (Realtime API, oct 2024).
- **o-series (razonadores):** o1 (sept 2024), o3 (dic 2024 / early 2025), **o3-pro**, **o4-mini**. Entrenados con RL verificable sobre cadenas largas. Rompieron techos en AIME, GPQA, Codeforces y ARC-AGI. o3 fue el primer modelo en superar humano-promedio en ARC-AGI-1 (dic 2024).
- **Modalidades:** texto, visión, audio (Realtime), generación de imágenes (GPT-image), video en labs (Sora).
- **Diferenciadores:** ecosistema (ChatGPT, GPTs, Assistants API), Realtime voice, fine-tuning disponible.

**Fuentes:** https://openai.com/news/ · https://platform.openai.com/docs/models · https://openai.com/index/learning-to-reason-with-llms/

### 5.3 Google — Gemini 2.x / 3.x
- **Gemini 2.5 Pro / Flash / Deep Think** (2025): con **Deep Think** como modo razonador. Ventana líder del mercado (1M-2M tokens en Pro).
- **Gemini 3** (⚠️ verificar release en 2026): sucesor con mejoras en multimodalidad y razonamiento.
- **Modalidades:** **multimodal nativo desde el entrenamiento** — texto, imagen, audio, video (Q&A sobre vídeo de horas).
- **Diferenciadores:** contextos larguísimos, integración con ecosistema Google (Search, Workspace, Android), TPUs propias, Gemini Flash ultra barato, Gemini Nano on-device.

**Fuentes:** https://deepmind.google/technologies/gemini/ · https://ai.google.dev/gemini-api/docs/models

### 5.4 DeepSeek — V3 y R1 (y sucesores)
- **DeepSeek V3** (dic 2024): MoE de 671B parámetros totales, ~37B activos por token. Entrenado por una fracción del coste típico (~$5.5M reportados) con performance comparable a GPT-4o en muchos benchmarks. Abrió el debate de eficiencia.
- **DeepSeek R1** (enero 2025): primer razonador open-weights competitivo con o1. Entrenado con RL puro (sin SFT previo en R1-Zero) sobre recompensas verificables. Paper abierto, pesos MIT license. Shockeó mercados y aceleró commoditización.
- **DeepSeek V4 / R2** (⚠️ verificar disponibilidad a abril 2026).
- **Modalidades:** texto principalmente; multimodal en siblings VL.
- **Diferenciadores:** open weights, recetas publicadas, eficiencia, MoE agresivo.

**Fuentes:** https://arxiv.org/abs/2412.19437 · https://arxiv.org/abs/2501.12948 · https://github.com/deepseek-ai

### 5.5 Meta — Llama 4 y familia
- **Llama 4** (anunciado 2025, ⚠️ verificar variantes): salto a MoE nativo (Scout, Maverick, Behemoth como variantes). Contextos largos, multimodal.
- **Llama 3.3 70B / 3.1 405B:** siguen en uso amplio por open-weights y ecosistema.
- **Modalidades:** texto y visión; audio/video en roadmap.
- **Diferenciadores:** **open weights** (licencia Llama Community), el mayor ecosistema de derivados y fine-tunes, disponibilidad en Hugging Face, integración PyTorch nativa.

**Fuentes:** https://ai.meta.com/ · https://www.llama.com/

### 5.6 xAI — Grok
- **Grok 3 / Grok 4** (⚠️ verificar versiones): Grok 3 lanzado Feb 2025 con variante razonadora ("Think"). Entrenado en cluster Colossus (100K H100s, luego ampliado).
- **Modalidades:** texto, visión, integración nativa con X (datos en tiempo real).
- **Diferenciadores:** acceso a X en tiempo real, posicionamiento "menos filtrado", velocidad de iteración.

**Fuentes:** https://x.ai/ · https://x.ai/news

### 5.7 Mistral
- **Mistral Large 2**, **Small 3**, **Codestral**, **Pixtral** (multimodal): énfasis en eficiencia y open weights parciales.
- **Diferenciadores:** jugador europeo (Francia), fuerte en enterprise EU, varios modelos Apache 2.0.

**Fuentes:** https://mistral.ai/ · https://mistral.ai/news

### 5.8 Alibaba — Qwen
- **Qwen 2.5 / Qwen 3** (⚠️ verificar versiones): familia china muy competitiva, con variantes Coder, Math, VL, Audio. Open weights y líderes en varios rankings open.
- **Diferenciadores:** open weights agresivos, modelos de dominio, multilingüe fuerte (chino + inglés + más).

**Fuentes:** https://qwenlm.github.io/ · https://github.com/QwenLM

### 5.9 Otros open relevantes
- **Cohere Command R+** — RAG-first, enterprise.
- **AI21 Jamba** — híbrido Transformer + Mamba, contextos largos.
- **Microsoft Phi-4 / Phi-4 mini** — small models eficientes.
- **01.AI Yi**, **Baichuan**, **Zhipu GLM** — familia china open.

**Leaderboards vivos para consultar:**
- LMArena — https://lmarena.ai/
- Artificial Analysis — https://artificialanalysis.ai/
- HF Open LLM Leaderboard — https://huggingface.co/open-llm-leaderboard

---

## 6. Modelos "razonadores" vs. modelos "chat"

La distinción más importante para arquitectura, emergida 2024-2025 y consolidada en 2026.

### 6.1 Qué cambia
- **Chat model (GPT-4o, Claude Sonnet base, Gemini Flash):** responde en un forward pass. Latencia baja (cientos de ms a primer token), coste bajo. Buenos en conversación, extracción, transformación, RAG, clasificación.
- **Reasoning model (o1, o3, o4-mini, Claude Opus con *extended thinking*, DeepSeek R1, Gemini Deep Think):** antes de responder, genera una **cadena de razonamiento interno larga** (cientos a decenas de miles de tokens de "thinking" no visibles o semi-visibles). Entrenado con RL sobre recompensas verificables. Mucho mejor en mates competitivas, coding agéntico, planning, puzzles; peor en latencia y coste.

### 6.2 Test-time compute como nueva dimensión
El insight: **mejoras calidad sin reentrenar, gastando más cómputo en inferencia**. Rompe la ecuación clásica de scaling. OpenAI mostró con o1 que la performance escala log-linealmente con tokens de razonamiento.

### 6.3 Implicaciones para arquitectura
1. **Enrutamiento de modelos:** la app decide qué clase usar por tarea. Resumir PDF → chat. Refactorizar módulo con tests → reasoning. Patrón común: chatbot que llama a razonador solo para tareas duras.
2. **Token budget para thinking:** APIs modernas (Claude `thinking`, OpenAI `reasoning_effort: low|medium|high`) permiten controlar cuánto razona. Parámetro de diseño.
3. **Latencia:** razonador puede tardar 30-180 s. UX asíncrona (streaming del thinking, progress indicators, tareas en background).
4. **Coste:** tokens de thinking **son facturables**. Una query puede salir 10-50× más cara.
5. **Observabilidad:** medir calidad *y* tokens de razonamiento.
6. **Tool use + reasoning:** "pensar → llamar tool → ver resultado → seguir pensando" es el núcleo de agentes modernos (o3 + tools, Claude extended thinking + tool use interleaved).

**Fuentes:** https://openai.com/index/learning-to-reason-with-llms/ · https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking · https://arxiv.org/abs/2501.12948

---

## 7. Benchmarks relevantes

### 7.1 Clásicos (muchos saturados)
- **MMLU** (Hendrycks et al. 2020): 57 tareas académicas multiple-choice. Humano experto ~90%. **Saturado:** frontier 88-92%+. Sanity check, no discriminador.
- **MMLU-Pro:** versión más dura (10 opciones, razonamiento). Menos saturado.
- **HumanEval** (Chen et al. 2021): 164 problemas Python. Saturado >95%. Útil en didáctica, no en ranking serio.

### 7.2 Vigentes en 2026
- **GPQA** (Rein et al. 2023): preguntas PhD-level que expertos fuera del dominio fallan incluso con Google. **GPQA Diamond** es el subset duro (~200 preguntas). Frontier 2025-2026 rondan 70-85%; humanos expertos ~65-75%.
- **SWE-bench / SWE-bench Verified** (Jimenez et al. 2023): issues reales de GitHub, el modelo produce un patch que pase tests. **El benchmark más relevante para coding agéntico real.** Frontier 2025-2026: 55-75%+.
- **AIME:** olimpiada de mates nivel medio-alto. Métrica clave para razonadores.
- **ARC-AGI** (Chollet 2019): puzzles visuales de lógica fluida, fáciles para humanos y difíciles para LLMs. o3 superó ~75% en ARC-AGI-1 (dic 2024). **ARC-AGI-2** (2025) reseteó el techo.
- **MMMU** (Yue et al. 2023): visión + razonamiento académico. Benchmark multimodal de referencia.
- **LiveCodeBench / Codeforces:** competitive programming, menos contaminados por data leakage.
- **HLE (Humanity's Last Exam)** (2025): preguntas expertas multidominio diseñadas para ser no-googleables.
- **τ-bench / tau-bench:** agentes con tool use y conversación multi-turno (airline, retail). Muy relevante para producción.

### 7.3 Arenas y meta-agregadores
- **LMArena / Chatbot Arena:** rankings por votos humanos blind. "Verdad de mercado".
- **Artificial Analysis:** agregador de benchmarks, precio, latencia, throughput.

### 7.4 Qué recordar
- Los clásicos están saturados; ranquear por ahí es ingenuo.
- **Contaminación de datos:** benchmarks públicos filtran al training data. Confía más en benchmarks recientes o privados.
- Para elegir modelo, **cruza**: capacidad (GPQA/SWE-bench) + preferencia humana (LMArena) + coste/latencia (Artificial Analysis) + **tu propio eval sobre tu tarea**.

---

## 8. Scaling laws y el debate actual

### 8.1 Leyes clásicas
- **Kaplan et al. 2020** (OpenAI): performance escala como ley de potencias en parámetros (N), datos (D), cómputo (C). Priorizar parámetros sobre datos para presupuesto fijo.
- **Chinchilla** (Hoffmann et al. 2022, DeepMind): corrigió Kaplan. Para cómputo fijo, óptimo ~20 tokens por parámetro (Kaplan estaba sub-entrenado). Reentrenaron 70B con 1.4T tokens y superó a Gopher 280B. Cambió el juego.

### 8.2 ¿Siguen vigentes? — **Parcialmente**
Tres matices a 2026:
1. **Pre-training scaling sigue, con rendimientos decrecientes.** El salto tipo GPT-3→GPT-4 es más difícil de replicar. *"Pre-training as we know it will end"* — Sutskever, NeurIPS 2024.
2. **Data wall:** el texto humano de alta calidad es finito. Modelos frontier ya usan ~50-100% del texto indexado útil. Soluciones: **datos sintéticos**, multimodal (video, audio añaden masa), RL en entornos.
3. **Test-time compute como nueva escala.** Desde o1 (2024), se añade una cuarta variable: cómputo de inferencia (tokens de razonamiento). Escala log-linealmente. Dimensión dominante en 2025-2026 para tareas hard.

### 8.3 Post-training / RL scaling
Otra dimensión emergente: escalar post-training (RLHF / RLVR) con más datos de preferencia, más entornos verificables, más self-play. DeepSeek R1 y o3 son ejemplos. Barato comparado con pre-training y returns grandes en razonamiento.

### 8.4 Implicación arquitectónica
- No apostar por "el modelo del próximo año será 10× mejor en todo". Ganancias son **dispares**: grandes en razonamiento/coding, menores en chat general.
- Diseñar pensando en **composición de modelos** (small para el 80% de queries, frontier razonador para el 20% duro) y **presupuestos de compute en inferencia**.

**Fuentes:** https://arxiv.org/abs/2001.08361 · https://arxiv.org/abs/2203.15556 · https://epochai.org/

---

## 9. Modalidades — estado del arte (abril 2026)

### 9.1 Texto
Maduro. Razonamiento sigue siendo la frontera. Ventanas: 1-2M tokens en Gemini, 200K-1M en Claude, 256-400K en GPT-5. **Long context is mostly solved; quality within long context, no.** Needle-in-haystack ya no discrimina; benchmarks como RULER y LongBench-v2 sí.

### 9.2 Visión
Estándar en frontier desde 2024. Claude 3+, GPT-4V/4o+, Gemini, Llama 3.2+ Vision, Qwen-VL, Pixtral. OCR, análisis de gráficos, diagramas, screenshots de UI (clave para "computer use"). **MMMU** ~70-80% en frontier 2025-2026.

### 9.3 Audio / voz en tiempo real
- **OpenAI Realtime API (GPT-4o → GPT-5):** voz-a-voz end-to-end, latencias 200-400 ms. Oct 2024. Cambió UX de asistentes.
- **Gemini Live:** capacidades similares.
- **Claude:** entrada de audio en algunas vías; voz nativa ⚠️ verificar.
- **Modelos dedicados:** Whisper (ASR open), ElevenLabs (TTS), Kyutai Moshi (full-duplex open), Sesame.
- **Estado:** *commodity* emergente. Patrón: WebRTC/WS + streaming bidireccional + interrupciones naturales.

### 9.4 Video
- **Input (comprensión):** Gemini 2.x/3.x líder claro en vídeo largo (horas). GPT-5 y Claude aceptan fotogramas.
- **Generación:** **Sora 2** (OpenAI), **Veo 3** (Google DeepMind), **Runway Gen-4**, **Kling**, **Pika**. Clips 10-60s coherentes, con audio sincronizado en algunos casos.

### 9.5 Generación de imágenes
- GPT-image (ChatGPT), Imagen 3/4 (Google), Firefly 3 (Adobe), Midjourney v7, Stable Diffusion 3 / Flux (open, ComfyUI), Ideogram (fuerte en texto dentro de imagen).

### 9.6 Implicación arquitectónica
"Multimodal" deja de ser feature y se vuelve **norma del input**. La app moderna asume mensaje = texto + imagen + audio. Prompts y UX deben estar diseñados para ello desde el día uno.

**Fuentes:** https://platform.openai.com/docs/guides/realtime · https://deepmind.google/technologies/veo/ · https://openai.com/sora/ · https://mmmu-benchmark.github.io/

---

## 10. Cierre del bloque — tres mensajes para el alumno

1. **El LLM es una capa de infraestructura, no una feature.** Se consume como API/weights. La diferenciación del producto vive *alrededor* (prompts, datos, tooling, eval, UX). *Esto justifica el curso entero.*
2. **No hay "un mejor modelo". Hay un mejor modelo para *tu* tarea, precio y latencia.** El panorama es plural (chat vs. razonador; frontier vs. small; cerrado vs. open) y cambia cada trimestre. La habilidad es saber elegir y saber cambiar.
3. **Las limitaciones (alucinación, cutoff, cálculo, consistencia) son la razón por la que existe el resto del curso.** RAG, tool use, orquestación, memoria, evaluación: todo son respuestas arquitectónicas a fallos conocidos del modelo base.

---

## Fuentes (agrupadas)

### Papers fundacionales
- Vaswani et al., *Attention Is All You Need* (2017) — https://arxiv.org/abs/1706.03762
- Brown et al., *Language Models are Few-Shot Learners* — GPT-3 (2020) — https://arxiv.org/abs/2005.14165
- Bommasani et al., *On the Opportunities and Risks of Foundation Models* (2021) — https://arxiv.org/abs/2108.07258
- Wei et al., *Chain-of-Thought Prompting* (2022) — https://arxiv.org/abs/2201.11903
- Wei et al., *Emergent Abilities of LLMs* (2022) — https://arxiv.org/abs/2206.07682
- Schaeffer et al., *Are Emergent Abilities a Mirage?* (2023) — https://arxiv.org/abs/2304.15004

### Alineamiento y post-training
- Ouyang et al., InstructGPT (2022) — https://arxiv.org/abs/2203.02155
- Bai et al., Constitutional AI (2022) — https://arxiv.org/abs/2212.08073
- Rafailov et al., DPO (2023) — https://arxiv.org/abs/2305.18290
- Anthropic, *Core Views on AI Safety* — https://www.anthropic.com/news/core-views-on-ai-safety

### Scaling laws
- Kaplan et al. (2020) — https://arxiv.org/abs/2001.08361
- Hoffmann et al., Chinchilla (2022) — https://arxiv.org/abs/2203.15556
- Epoch AI — https://epochai.org/

### Arquitectura y eficiencia
- FlashAttention — https://arxiv.org/abs/2205.14135
- The Illustrated Transformer — https://jalammar.github.io/illustrated-transformer/
- The Annotated Transformer — https://nlp.seas.harvard.edu/annotated-transformer/

### Razonadores
- OpenAI, *Learning to Reason with LLMs* (o1) — https://openai.com/index/learning-to-reason-with-llms/
- DeepSeek-R1 — https://arxiv.org/abs/2501.12948
- DeepSeek-V3 — https://arxiv.org/abs/2412.19437
- Anthropic *Extended Thinking* — https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking

### Modelos — fuentes oficiales
- Anthropic Claude docs — https://docs.anthropic.com/en/docs/about-claude/models
- Anthropic news — https://www.anthropic.com/news
- Anthropic release notes — https://docs.anthropic.com/en/release-notes/overview
- OpenAI news — https://openai.com/news/
- OpenAI models — https://platform.openai.com/docs/models
- Google DeepMind Gemini — https://deepmind.google/technologies/gemini/
- Google AI for Developers — https://ai.google.dev/gemini-api/docs/models
- Meta AI — https://ai.meta.com/
- Llama — https://www.llama.com/
- xAI — https://x.ai/ · https://x.ai/news
- Mistral — https://mistral.ai/ · https://mistral.ai/news
- Qwen — https://qwenlm.github.io/ · https://github.com/QwenLM
- DeepSeek — https://github.com/deepseek-ai

### Benchmarks
- MMLU — https://arxiv.org/abs/2009.03300
- MMLU-Pro — https://arxiv.org/abs/2406.01574
- HumanEval — https://arxiv.org/abs/2107.03374
- GPQA — https://arxiv.org/abs/2311.12022
- SWE-bench — https://arxiv.org/abs/2310.06770 · https://www.swebench.com/
- ARC-AGI — https://arcprize.org/
- MMMU — https://mmmu-benchmark.github.io/
- tau-bench — https://arxiv.org/abs/2406.12045
- Humanity's Last Exam — https://agi.safe.ai/

### Leaderboards y meta-agregadores
- LMArena — https://lmarena.ai/
- Artificial Analysis — https://artificialanalysis.ai/
- HF Open LLM Leaderboard — https://huggingface.co/open-llm-leaderboard

### Multimodal
- OpenAI Realtime API — https://platform.openai.com/docs/guides/realtime
- Sora — https://openai.com/sora/
- Google DeepMind Veo — https://deepmind.google/technologies/veo/
- Pixtral — https://mistral.ai/news/pixtral-12b/

---

## Datos volátiles a verificar

Los nombres, fechas y rankings de modelos cambian cada 6-8 semanas. Si trabajas con este material meses después, revisa estas fuentes oficiales:

- Claude (Anthropic): https://docs.anthropic.com/en/release-notes/overview
- GPT y o-series (OpenAI): https://platform.openai.com/docs/models
- Gemini (Google): https://ai.google.dev/gemini-api/docs/models
- Llama (Meta): variantes disponibles en https://ai.meta.com/llama/
- Ranking top-10 actual: https://lmarena.ai
- Pricing y latencia comparada: https://artificialanalysis.ai
- Estado de ARC-AGI-2 y HLE: https://arcprize.org
