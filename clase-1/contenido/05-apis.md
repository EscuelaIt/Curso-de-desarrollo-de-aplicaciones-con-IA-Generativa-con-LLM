# Bloque 5 — APIs de chat completions y compatibilidad entre proveedores

> Dossier para la **Clase 1** del curso *Arquitectura de Aplicaciones con IA Generativa* (EscuelaIT, abril 2026). Nivel: desarrolladores intermedio-avanzados.

---

## 1. Anatomía de una llamada chat completions

Desde marzo de 2023 el endpoint `/v1/chat/completions` de OpenAI se convirtió en la *forma canónica* de hablar con un LLM. Una llamada es, conceptualmente, una función pura:

```
f(model, messages, params) -> { choices, usage, finish_reason }
```

### 1.1 Endpoints canónicos

| Proveedor | Método | URL | Auth |
|-----------|--------|-----|------|
| OpenAI | POST | `https://api.openai.com/v1/chat/completions` | `Authorization: Bearer sk-...` |
| Anthropic | POST | `https://api.anthropic.com/v1/messages` | `x-api-key: sk-ant-...` + `anthropic-version: 2023-06-01` |
| DeepSeek | POST | `https://api.deepseek.com/chat/completions` | `Authorization: Bearer sk-...` |
| Groq | POST | `https://api.groq.com/openai/v1/chat/completions` | `Authorization: Bearer gsk_...` |
| Gemini (nativo) | POST | `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` | `?key=` o `Authorization: Bearer` |
| Gemini (compat OpenAI) | POST | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` | Bearer |

La elección arquitectónica importante: **casi todo el ecosistema fuera de Anthropic y Google "nativo" habla OpenAI chat completions**.

### 1.2 Parámetros del request (OpenAI)

```jsonc
{
  "model": "gpt-5-mini",                // string, requerido
  "messages": [ ... ],                  // array, requerido
  "temperature": 0.7,                   // 0..2 — muestreo; 0 = casi determinista
  "top_p": 1.0,                         // nucleus sampling; usa temperature O top_p, no ambos
  "max_tokens": 1024,                   // limita la respuesta (en algunos modelos renombrado a max_completion_tokens)
  "frequency_penalty": 0.0,             // -2..2 — penaliza repetición token-a-token
  "presence_penalty": 0.0,              // -2..2 — penaliza tokens ya vistos
  "stop": ["\n\n", "###"],             // hasta 4 secuencias que cortan la generación
  "seed": 42,                           // best-effort determinismo (no garantiza)
  "response_format": { "type": "json_schema", "json_schema": { ... } },
  "tools": [ ... ],
  "tool_choice": "auto",                // "none" | "auto" | "required" | {"type":"function","function":{"name":"..."}}
  "stream": true,
  "stream_options": { "include_usage": true },
  "user": "user-123",                   // identificador para moderación/abuse detection
  "logit_bias": { "50256": -100 },
  "logprobs": false,
  "n": 1                                // número de candidatos (raramente > 1 en prod)
}
```

Parámetros clave a recordar:
- `temperature` y `top_p` son mutuamente recomendados (elige uno). Para extracción estructurada: `temperature: 0`.
- `seed` es *best-effort*: OpenAI devuelve `system_fingerprint` para que puedas detectar si cambió el backend.
- `max_tokens` se ha ido renombrando a `max_completion_tokens` en los modelos "razonadores" (o-series, GPT-5 con `reasoning_effort`) porque los tokens de razonamiento cuentan aparte.

### 1.3 Estructura de `messages`

```python
messages = [
    {"role": "system", "content": "Eres un asistente experto en elecciones peruanas."},
    {"role": "user", "content": "¿Quién va ganando en Lima?"},
    {"role": "assistant", "content": "Según el último corte de ONPE..."},
    {"role": "user", "content": [
        {"type": "text", "text": "¿Y en esta imagen?"},
        {"type": "image_url", "image_url": {"url": "data:image/png;base64,iVBOR..."}}
    ]},
    {"role": "assistant", "tool_calls": [
        {"id": "call_abc", "type": "function",
         "function": {"name": "get_results", "arguments": "{\"region\":\"Lima\"}"}}
    ]},
    {"role": "tool", "tool_call_id": "call_abc", "content": "{\"votos\": 1234567}"}
]
```

Cuatro roles: `system`, `user`, `assistant`, `tool`. `content` puede ser **string** (texto plano) o **array de parts** (multimodal / mixto).

### 1.4 Response

```jsonc
{
  "id": "chatcmpl-9xY...",
  "object": "chat.completion",
  "created": 1744800000,
  "model": "gpt-5-mini-2025-10-07",
  "system_fingerprint": "fp_abc123",
  "choices": [
    {
      "index": 0,
      "message": { "role": "assistant", "content": "Según ONPE..." },
      "finish_reason": "stop",         // "stop"|"length"|"tool_calls"|"content_filter"|"function_call"
      "logprobs": null
    }
  ],
  "usage": {
    "prompt_tokens": 523,
    "completion_tokens": 118,
    "total_tokens": 641,
    "prompt_tokens_details": { "cached_tokens": 384 }
  }
}
```

### 1.5 Ejemplo completo — curl + Python SDK

```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-5-mini",
    "messages": [
      {"role":"system","content":"Responde en JSON."},
      {"role":"user","content":"Dame 3 distritos de Lima."}
    ],
    "temperature": 0,
    "response_format": {"type":"json_object"}
  }'
```

```python
from openai import OpenAI
client = OpenAI()  # lee OPENAI_API_KEY

resp = client.chat.completions.create(
    model="gpt-5-mini",
    messages=[
        {"role": "system", "content": "Responde en JSON."},
        {"role": "user", "content": "Dame 3 distritos de Lima."},
    ],
    temperature=0,
    response_format={"type": "json_object"},
)
print(resp.choices[0].message.content)
print(resp.usage.total_tokens)
```

---

## 2. El "estándar de facto" OpenAI-compatible

### 2.1 Por qué OpenAI se convirtió en estándar

1. **Fue primero**: ChatGPT en nov-2022, API en mar-2023. Todo el tooling (LangChain, LlamaIndex, Instructor, Vercel AI SDK) nació sobre ese esquema.
2. **Suficientemente simple**: `messages[]` con roles es un modelo mental directo.
3. **Red de ecosistema**: si tu proveedor *no* es compatible, pierdes acceso a miles de herramientas OSS en un fin de semana.
4. **Presión del mercado**: ningún proveedor alternativo puede permitirse obligar a los devs a aprender una API nueva.

### 2.2 Proveedores OpenAI-compatible (abril 2026)

| Proveedor | `base_url` | Notas |
|-----------|-----------|-------|
| DeepSeek | `https://api.deepseek.com` | `deepseek-chat`, `deepseek-reasoner`. Caching automático en disco. |
| Groq | `https://api.groq.com/openai/v1` | Llama/Mixtral a ~500 t/s (LPU). |
| Together AI | `https://api.together.xyz/v1` | Catálogo amplio de OSS. |
| Fireworks AI | `https://api.fireworks.ai/inference/v1` | OSS + function calling bien soportado. |
| Mistral | `https://api.mistral.ai/v1` | Tiene también API nativa; la OpenAI-compat cubre lo esencial. |
| xAI (Grok) | `https://api.x.ai/v1` | Compat total con SDK de OpenAI. |
| Perplexity | `https://api.perplexity.ai` | `sonar`, `sonar-pro`; añaden `citations` en la respuesta. |
| Ollama (local) | `http://localhost:11434/v1` | `/v1/chat/completions` shim. |
| vLLM (self-host) | `http://host:8000/v1` | El estándar OSS para servir modelos con la API OpenAI. |
| LM Studio | `http://localhost:1234/v1` | GUI desktop. |
| OpenRouter | `https://openrouter.ai/api/v1` | Meta-proveedor: 300+ modelos detrás del mismo schema. |
| LiteLLM (proxy) | `http://litellm:4000` | Traduce 100+ APIs al schema OpenAI. |

### 2.3 Qué significa "OpenAI-compatible" en la práctica

```python
# De OpenAI a DeepSeek en 2 líneas:
client = OpenAI(
    api_key=os.environ["DEEPSEEK_API_KEY"],
    base_url="https://api.deepseek.com",
)
resp = client.chat.completions.create(model="deepseek-chat", messages=[...])
```

### 2.4 Caveats — los bordes ásperos

Aunque el *happy path* (`messages` + `temperature` + `stream`) es 100% portable, **los siguientes features divergen con frecuencia**:

- **Tool calling**: algunos proveedores (xAI, Groq para ciertos modelos, llama.cpp a través de Ollama) aceptan el campo `tools` pero el modelo alucina argumentos o no respeta `tool_choice: "required"`.
- **`response_format: json_schema`** (structured outputs): solo OpenAI, Fireworks y algunos modelos de Together lo implementan de verdad con *constrained decoding*. En el resto degrada a `json_object` o se ignora.
- **Streaming**: el formato SSE es el mismo (ver §4), pero OpenAI envía `stream_options.include_usage` con un chunk final de `usage`; la mayoría de los compat-clones aún no lo emiten.
- **`logprobs`, `seed`, `logit_bias`**: soporte irregular.
- **Modelos razonadores**: `reasoning_effort`, `reasoning` content block — específicos de OpenAI/DeepSeek respectivamente.
- **Vision**: algunos aceptan `image_url` como URL http, otros solo base64.

Regla práctica: **prueba con un script de smoke test antes de migrar**.

---

## 3. Anthropic Messages API — por qué NO es OpenAI-compatible

Anthropic tomó decisiones de diseño deliberadamente distintas. Esto no es un accidente: el API refleja cómo Claude *realmente* consume prompts.

### 3.1 Diferencias clave

| Aspecto | OpenAI | Anthropic |
|---------|--------|-----------|
| URL | `/v1/chat/completions` | `/v1/messages` |
| System prompt | Un mensaje con `role: system` | Parámetro `system` separado (string o array de blocks) |
| Content | String o array heterogéneo | **Siempre** array de *content blocks* tipados |
| `max_tokens` | Opcional | **Obligatorio** |
| Tool result | `role: tool` con `tool_call_id` | `role: user` con block `tool_result` |
| Roles permitidos | system, user, assistant, tool | **solo** user y assistant (alternados) |
| Cache | `cache_control` explícito | Automático (desde 2024) |
| Header de versión | No | `anthropic-version: 2023-06-01` |

### 3.2 Content blocks

```python
import anthropic
client = anthropic.Anthropic()

resp = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    system=[
        {"type": "text", "text": "Eres un analista electoral.",
         "cache_control": {"type": "ephemeral"}}   # cache breakpoint
    ],
    messages=[
        {"role": "user", "content": [
            {"type": "text", "text": "Analiza esta mesa:"},
            {"type": "image", "source": {
                "type": "base64", "media_type": "image/png", "data": "iVBOR..."
            }}
        ]}
    ],
)
# resp.content es una lista de blocks; típicamente [{type:"text", text:"..."}]
print(resp.content[0].text)
print(resp.usage)  # input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens
```

Tipos de block posibles: `text`, `image`, `document` (PDF nativo), `tool_use`, `tool_result`, `thinking` (extended thinking), `redacted_thinking`, `server_tool_use`, `web_search_tool_result`.

### 3.3 Prompt caching con `cache_control`

Anthropic obliga a **marcar explícitamente** hasta 4 *breakpoints* (`cache_control: {type: "ephemeral"}`). Todo lo que esté *antes* del breakpoint se cachea. TTL de 5 min por defecto, o 1 h con `{type: "ephemeral", ttl: "1h"}` (beta). Lectura de cache: ~10% del precio de input. Escritura: ~125% (5 min) o ~200% (1 h).

### 3.4 Extended thinking

Claude 4.x permite un presupuesto de razonamiento visible:

```python
resp = client.messages.create(
    model="claude-opus-4-5",
    max_tokens=16000,
    thinking={"type": "enabled", "budget_tokens": 10000},
    messages=[{"role": "user", "content": "Demuestra que √2 es irracional."}],
)
for block in resp.content:
    if block.type == "thinking":
        print("[razonando]", block.thinking)
    elif block.type == "text":
        print("[respuesta]", block.text)
```

---

## 4. Streaming (SSE — Server-Sent Events)

### 4.1 Por qué existe

Un LLM genera token a token. Esperar 8 segundos a que se forme una respuesta larga es UX inaceptable. SSE permite **empujar** tokens al cliente a medida que se producen y reduce el **TTFT** (Time To First Token) de ~5 s a ~200 ms percibidos. Es HTTP/1.1 normal, con `Content-Type: text/event-stream` y chunks `data: {...}\n\n`.

### 4.2 Diferencias OpenAI vs Anthropic

**OpenAI** — flujo plano de *deltas*:
```
data: {"id":"...","choices":[{"delta":{"role":"assistant"},"index":0}]}

data: {"id":"...","choices":[{"delta":{"content":"Ho"},"index":0}]}

data: {"id":"...","choices":[{"delta":{"content":"la"},"index":0}]}

data: {"id":"...","choices":[{"delta":{},"index":0,"finish_reason":"stop"}]}

data: [DONE]
```

**Anthropic** — flujo de *eventos tipados* (más rico, más verboso):
```
event: message_start
data: {"type":"message_start","message":{...}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Ho"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"la"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":2}}

event: message_stop
data: {"type":"message_stop"}
```

Tipos de event Anthropic: `message_start`, `content_block_start/delta/stop`, `message_delta`, `message_stop`, `ping`, `error`. Esta granularidad es **necesaria** para streaming multimodal (distinguir tool_use de text de thinking en paralelo).

### 4.3 Consumo en Python

```python
stream = client.chat.completions.create(
    model="gpt-5-mini",
    messages=[{"role": "user", "content": "Cuenta hasta 5."}],
    stream=True,
    stream_options={"include_usage": True},
)
for chunk in stream:
    if chunk.choices and (d := chunk.choices[0].delta.content):
        print(d, end="", flush=True)
    if chunk.usage:  # último chunk
        print(f"\n[tokens: {chunk.usage.total_tokens}]")
```

### 4.4 Consumo en JavaScript — Vercel AI SDK

```ts
// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({ model: openai('gpt-5-mini'), messages });
  return result.toDataStreamResponse();
}
```

```tsx
// app/page.tsx
'use client';
import { useChat } from '@ai-sdk/react';
export default function Page() {
  const { messages, input, handleSubmit, handleInputChange } = useChat();
  return <form onSubmit={handleSubmit}>...</form>;
}
```

### 4.5 Errores y reconnection

SSE nativo soporta reconexión con `Last-Event-ID`, pero los LLMs **no son reanudables**: reconectar significa repetir el request desde el inicio. Estrategia realista:
- Timeout cliente ~60 s por chunk.
- Si cae a mitad: reenvía la pregunta completa (idempotente si usas `seed`).
- Backoff exponencial con jitter para 429 (rate limit) y 529 (Anthropic overloaded).
- No reintentes en 400 (bad request) ni 401 (auth).

### 4.6 Estado en `peru-elecciones`

El router monta `/api/stream` como **stub**: `r.Get("/stream", s.stub("sse"))` (`internal/api/router.go:72`). El endpoint devuelve un placeholder — el chat real sigue siendo `POST /api/chat` síncrono. Migrar a SSE implica:
1. Añadir `Chat` con signatura streaming al `llm.Client` (canal de strings).
2. En `DeepSeek.Chat`, setear `Stream: true` y parsear `data: ...\n\n`.
3. El handler HTTP fija `Content-Type: text/event-stream` + `flusher.Flush()` tras cada delta.

---

## 5. Tool Use / Function Calling

### 5.1 El ciclo de vida

```
[1] Tú declaras tools (JSON Schema)
[2] Mandas messages + tools al modelo
[3] Modelo decide: responde texto O pide llamar una tool (tool_calls / tool_use block)
[4] TU CÓDIGO ejecuta la tool (el modelo NUNCA ejecuta)
[5] Devuelves el resultado como tool_result
[6] Modelo continúa (puede pedir más tools o responder final)
```

Es importante enfatizar al aula: **el modelo no ejecuta nada**. Genera una intención estructurada; el runtime es tuyo.

### 5.2 OpenAI format

```python
tools = [{
    "type": "function",
    "function": {
        "name": "get_resultados_region",
        "description": "Obtiene el conteo ONPE por región.",
        "parameters": {
            "type": "object",
            "properties": {
                "region": {"type": "string", "description": "Código ubigeo 2 dígitos"},
                "eleccion_id": {"type": "integer"}
            },
            "required": ["region", "eleccion_id"],
            "additionalProperties": False
        },
        "strict": True   # activa constrained decoding (GPT-4o+/GPT-5)
    }
}]

resp = client.chat.completions.create(
    model="gpt-5-mini",
    messages=messages,
    tools=tools,
    tool_choice="auto",   # "none" | "auto" | "required" | {"type":"function","function":{"name":"..."}}
    parallel_tool_calls=True,
)
for call in resp.choices[0].message.tool_calls or []:
    args = json.loads(call.function.arguments)
    result = run_tool(call.function.name, args)
    messages.append({"role": "tool", "tool_call_id": call.id,
                     "content": json.dumps(result)})
```

### 5.3 Anthropic format

```python
tools = [{
    "name": "get_resultados_region",
    "description": "Obtiene el conteo ONPE por región.",
    "input_schema": {
        "type": "object",
        "properties": {
            "region": {"type": "string"},
            "eleccion_id": {"type": "integer"}
        },
        "required": ["region", "eleccion_id"]
    }
}]

resp = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    tools=tools,
    tool_choice={"type": "auto"},   # {"type":"any"} | {"type":"tool","name":"..."} | {"type":"none"}
    messages=messages,
)
for block in resp.content:
    if block.type == "tool_use":
        result = run_tool(block.name, block.input)
        messages.append({"role": "assistant", "content": resp.content})
        messages.append({"role": "user", "content": [{
            "type": "tool_result",
            "tool_use_id": block.id,
            "content": json.dumps(result)
        }]})
```

Diferencias clave:
- OpenAI envuelve todo en `function`; Anthropic usa campos planos (`name`, `input_schema`).
- OpenAI: argumentos como **string JSON**; Anthropic: ya como **dict**.
- OpenAI usa `role:tool` para resultados; Anthropic los mete como `tool_result` dentro de un `role:user`.

### 5.4 Parallel tool calling

Ambos soportan que el modelo pida varias tools en el mismo turno. OpenAI: lista en `tool_calls[]`. Anthropic: varios blocks `tool_use` en `content[]`. Patrón: ejecutar en paralelo (`asyncio.gather`) y devolver todos los resultados en un solo turno `user`.

### 5.5 Caso realista en `peru-elecciones`

Hoy el sistema inyecta un *snapshot* JSON del conteo nacional en el system prompt (`BuildContext` en `internal/llm/prompt.go`). Con tool calling se podría convertir en:

```python
tools = [
  {"name": "get_nacional", "input_schema": {...}},
  {"name": "get_resultado_eleccion", "input_schema": {"eleccion_id": ...}},
  {"name": "get_proyeccion", "input_schema": {"eleccion_id": ...}},
]
```

El modelo decidiría **por pregunta** qué endpoint consultar, reduciendo el tamaño del prompt (hoy ~2-3 KB de contexto en cada llamada) y habilitando cachéabilidad agresiva del system prompt.

---

## 6. Structured Output / JSON Mode

### 6.1 Tres generaciones

1. **"Pídele JSON por favor"** (2023). Falla: el modelo agrega ` ```json ` fences, comas finales, o inventa campos.
2. **`response_format: {"type": "json_object"}`** (nov-2023). Garantiza que la *salida parsea* como JSON. No garantiza **qué** JSON.
3. **`response_format: {"type": "json_schema", ...}`** / Structured Outputs (ago-2024). *Constrained decoding*: el modelo solo puede emitir tokens válidos según tu schema. 100% parseable.

```python
resp = client.chat.completions.create(
    model="gpt-5-mini",
    messages=[{"role": "user", "content": "Extrae del texto: ..."}],
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "resultado",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "partido": {"type": "string"},
                    "votos": {"type": "integer"}
                },
                "required": ["partido", "votos"],
                "additionalProperties": False
            }
        }
    },
)
```

### 6.2 Integración con Pydantic

**Instructor** (OpenAI y otros):
```python
import instructor
from pydantic import BaseModel

class Resultado(BaseModel):
    partido: str
    votos: int

client = instructor.from_openai(OpenAI())
data: Resultado = client.chat.completions.create(
    model="gpt-5-mini",
    response_model=Resultado,
    messages=[{"role": "user", "content": "..."}],
)
```

**Pydantic AI** (framework agéntico oficial de Pydantic):
```python
from pydantic_ai import Agent
agent = Agent('openai:gpt-5-mini', result_type=Resultado)
result = agent.run_sync("Extrae: ...")
```

### 6.3 Anthropic — workarounds

Claude no expone `response_format`. El patrón estándar es **forzar una tool**:

```python
resp = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    tools=[{"name": "emit_resultado", "input_schema": Resultado.model_json_schema()}],
    tool_choice={"type": "tool", "name": "emit_resultado"},
    messages=messages,
)
data = Resultado(**resp.content[0].input)
```

### 6.4 Open-source — constrained decoding

- **Outlines**: regex/grammar-guided generation sobre vLLM, Transformers, llama.cpp.
- **jsonformer**: restringe el sampling token-a-token para cumplir un JSON Schema.
- **lm-format-enforcer**, **guidance**.

Útiles cuando autoalojas y quieres garantías fuertes sin pagar OpenAI.

### 6.5 Por qué falla "pídele que responda JSON sin más"

- Los modelos fueron entrenados en Markdown → tienden a fences.
- Sin constraint, pequeñas desviaciones (un `'` por `"`, trailing comma) rompen `json.loads`.
- Con escalas grandes (millones/día) incluso 0.5% de parse errors = miles de incidentes.
- Soluciones posibles: `json_schema` (lo mejor), tool use (Anthropic), o `json-repair`/`dirtyjson` como último recurso.

---

## 7. Prompt caching (abril 2026)

El caching es, en 2026, la palanca más grande de reducción de coste en apps LLM. Idea: un prompt con *prefix estable* largo (system + contexto + documentos) se *hashea* y su representación intermedia (KV cache) se reutiliza en llamadas futuras.

### 7.1 Anthropic — explícito

- Marcas hasta **4 breakpoints** con `cache_control: {"type": "ephemeral"}`.
- TTL: **5 min** (default) o **1 h** (`"ttl": "1h"`).
- Precio: **~10%** del input normal en *cache read*; **125%** (5 min) o **200%** (1 h) en *cache write*.
- Usage reporta `cache_creation_input_tokens` y `cache_read_input_tokens`.

### 7.2 OpenAI — automático

- Desde oct-2024. Prompts ≥1024 tokens con prefix idéntico se cachean en background.
- **Sin flag**: el sistema detecta el hit.
- Descuento: **50%** sobre la parte cached (en algunos modelos 75-90% con GPT-5).
- `usage.prompt_tokens_details.cached_tokens` lo reporta.

### 7.3 Google Gemini — contexto explícito

- API `cachedContents.create` sube el prefijo y obtienes un handle (`cachedContent`).
- TTL configurable (default 1 h). Tiene coste de storage por hora.
- Luego referencias `cachedContent: "cachedContents/abc123"` en cada `generateContent`.

### 7.4 DeepSeek — context caching automático en disco

- Transparent: el sistema detecta prefijos repetidos.
- Precio de lectura ~10% del input (varía por modelo).
- `usage.prompt_cache_hit_tokens` y `prompt_cache_miss_tokens` en la respuesta.

### 7.5 Impacto medible

En una app tipo `peru-elecciones` con system prompt de ~2 KB + contexto dinámico de ~3 KB, cachear los primeros 2 KB reduce input de ~5000 a ~2000 tokens facturables *a precio caché*. A 1M llamadas/mes, el ahorro típico es **60-80%** del coste de input.

---

## 8. Multimodalidad en la API

### 8.1 Inputs

| Modalidad | OpenAI (GPT-5) | Anthropic (Claude 4.5) | Gemini 2.x |
|-----------|---------------|-----------------------|------------|
| Imagen (base64) | sí (`image_url` con data URI) | sí (`image` block, base64) | sí (`inline_data`) |
| Imagen (URL) | sí | sí (con `url` source) | vía `file_data` (Files API) |
| PDF nativo | sí (Responses API) | sí (`document` block) | sí |
| Audio | sí (gpt-4o-audio, Realtime) | no nativo (transcripción vía externa) | sí (Gemini 2.0+) |
| Video | limitado | no (frames) | sí (nativo, archivos largos) |

```python
# OpenAI: imagen
messages = [{"role": "user", "content": [
    {"type": "text", "text": "¿Qué dice esta acta?"},
    {"type": "image_url", "image_url": {
        "url": f"data:image/png;base64,{b64}", "detail": "high"
    }}
]}]
```

### 8.2 Outputs

- Texto: todos.
- Audio: OpenAI Realtime API (WebRTC/WebSocket), Gemini Live. Synth dedicada: ElevenLabs.
- Imágenes: API separada (OpenAI `images.generate` con `gpt-image-1`; Google Imagen 3; no desde `chat/completions`).
- Video: Sora API (acceso limitado abril 2026), Veo 3 (Gemini).

---

## 9. Qué es portable y qué no — diseñando un cliente agnóstico

### 9.1 Tabla de portabilidad

| Feature | Portable | Parcialmente | NO portable |
|---------|----------|--------------|-------------|
| `messages` con roles básicos | ✔ | | |
| `temperature`, `max_tokens`, `top_p` | ✔ | | |
| Streaming de texto plano (SSE) | ✔ | | |
| Imágenes en input | | ✔ | |
| Tool calling (schema básico) | | ✔ | |
| `tool_choice: "required"` / strict mode | | | ✗ |
| `response_format: json_schema` | | | ✗ |
| Prompt caching (API) | | | ✗ |
| Extended thinking | | | ✗ |
| Parallel tool calls | | ✔ | |
| Logprobs / seed | | | ✗ |

### 9.2 Recomendación

Dos caminos para equipos:

**A. Abstracción propia mínima** (el camino de `peru-elecciones`):
```go
type Client interface {
    Chat(ctx context.Context, system string, history []Message) (Reply, error)
}
```
Tres métodos (`Chat`, `Stream`, `ChatTools`). Una implementación por proveedor. Pequeño, propio, fácil de debugear.

**B. LiteLLM / Vercel AI SDK**:
Si quieres *desde el día 1* soportar 10+ proveedores, observabilidad, budgets, fallbacks. Pagas en acoplamiento a la librería y en ocasional "magia" opaca.

Regla: **empieza con A** (un proveedor, interfaz tuya) y migra a B cuando realmente necesites multi-proveedor.

---

## 10. Ejemplo práctico — cambiar de proveedor en 3 líneas

### Python (el patrón de `peru-elecciones`)

```python
from openai import OpenAI

# OpenAI
client = OpenAI()

# DeepSeek — mismo SDK, 2 líneas cambiadas
client = OpenAI(api_key=os.environ["DEEPSEEK_API_KEY"],
                base_url="https://api.deepseek.com")

# Groq
client = OpenAI(api_key=os.environ["GROQ_API_KEY"],
                base_url="https://api.groq.com/openai/v1")

# Ollama local
client = OpenAI(api_key="ollama", base_url="http://localhost:11434/v1")

# Uso idéntico para todos:
resp = client.chat.completions.create(
    model="deepseek-chat",   # o "gpt-5-mini", "llama-3.3-70b", etc.
    messages=[{"role": "user", "content": "Hola"}],
)
```

### Go (como en `internal/llm/deepseek.go` de peru-elecciones)

```go
// Para cambiar de DeepSeek a Groq basta con env:
//   DEEPSEEK_BASE_URL=https://api.groq.com/openai/v1
//   DEEPSEEK_MODEL=llama-3.3-70b-versatile
ds := llm.NewDeepSeek(
    os.Getenv("DEEPSEEK_API_KEY"),
    os.Getenv("DEEPSEEK_BASE_URL"), // default https://api.deepseek.com
    os.Getenv("DEEPSEEK_MODEL"),
)
// El POST interno es siempre:
// POST {BaseURL}/chat/completions  con body OpenAI-shaped
```

La variable `BaseURL` es el único punto de cambio — así se demuestra en vivo la portabilidad del estándar.

---

## 11. Batch APIs

Cuando no necesitas respuesta *ahora*, los endpoints de batch ofrecen descuentos significativos a cambio de latencia asíncrona.

| Proveedor | Endpoint | Descuento | Latencia máxima |
|-----------|----------|-----------|-----------------|
| OpenAI | `/v1/batches` (input JSONL via Files API) | **~50%** | 24 h |
| Anthropic | Message Batches API (`/v1/messages/batches`) | **~50%** | 24 h |
| Gemini | Batch prediction (Vertex) | ~50% | 24 h |

Caso de uso típico:
- Enriquecer/clasificar un catálogo de 500k productos.
- Resumir transcripciones nocturnas.
- Backfills de embeddings.
- Evaluaciones offline.

```python
# OpenAI Batch
f = client.files.create(file=open("batch.jsonl", "rb"), purpose="batch")
batch = client.batches.create(
    input_file_id=f.id,
    endpoint="/v1/chat/completions",
    completion_window="24h",
)
# Polling hasta batch.status == "completed", luego descargas output_file_id.
```

No confundir con "batch de requests HTTP": aquí los requests se ejecutan en una cola de baja prioridad durante hasta 24 h.

---

## 12. Realtime APIs — voz en tiempo real

Para conversaciones **voz-a-voz** con latencia sub-segundo (~300-500 ms), los *chat completions* no sirven: tienes que enviar audio streaming y recibir audio streaming por el mismo canal bidireccional.

- **OpenAI Realtime API** (GA 2025): WebRTC o WebSocket; modelos `gpt-4o-realtime-preview`, `gpt-realtime`. Eventos JSON bidireccionales (`conversation.item.create`, `response.audio.delta`, etc.). Incluye VAD (voice activity detection) server-side, interrupciones, function calling.
- **Gemini Live API**: WebSocket con audio/video streaming nativo; modelos `gemini-2.0-flash-live`, `gemini-live-2.5-flash`.
- **Anthropic**: a abril 2026 no tiene una Realtime voice API propia; el patrón es STT (Whisper/Deepgram) → Claude → TTS (ElevenLabs/OpenAI TTS).

Lo importante: estas APIs existen y son la opción correcta para voz-a-voz, pero **no** son chat completions y requieren arquitectura diferente (WebSocket server, buffering, gestión de interrupciones). Para una app conversacional típica con UI textual, sigue siendo `chat/completions` con SSE.

---

## Fuentes

**OpenAI**
- API reference — Chat Completions: https://platform.openai.com/docs/api-reference/chat
- API reference — Create chat completion: https://platform.openai.com/docs/api-reference/chat/create
- Guide — Structured Outputs: https://platform.openai.com/docs/guides/structured-outputs
- Guide — Function calling / tools: https://platform.openai.com/docs/guides/function-calling
- Guide — Streaming responses: https://platform.openai.com/docs/guides/streaming-responses
- Guide — Prompt caching: https://platform.openai.com/docs/guides/prompt-caching
- Guide — Batch API: https://platform.openai.com/docs/guides/batch
- Realtime API: https://platform.openai.com/docs/guides/realtime
- Vision: https://platform.openai.com/docs/guides/vision

**Anthropic**
- API reference — Messages: https://docs.anthropic.com/en/api/messages
- API reference — Streaming Messages: https://docs.anthropic.com/en/api/messages-streaming
- Build — Prompt caching: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
- Build — Tool use: https://docs.anthropic.com/en/docs/build-with-claude/tool-use
- Build — Extended thinking: https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking
- Build — Vision: https://docs.anthropic.com/en/docs/build-with-claude/vision
- Message Batches API: https://docs.anthropic.com/en/docs/build-with-claude/batch-processing

**Google / Gemini**
- Generate content API: https://ai.google.dev/api/generate-content
- OpenAI compatibility: https://ai.google.dev/gemini-api/docs/openai
- Context caching: https://ai.google.dev/gemini-api/docs/caching
- Live API: https://ai.google.dev/gemini-api/docs/live

**Proveedores OpenAI-compatible**
- DeepSeek API docs: https://api-docs.deepseek.com/
- DeepSeek context caching: https://api-docs.deepseek.com/guides/kv_cache
- Groq API: https://console.groq.com/docs/api-reference
- Together AI: https://docs.together.ai/reference/chat-completions
- Fireworks AI: https://docs.fireworks.ai/api-reference/post-chatcompletions
- Mistral La Plateforme: https://docs.mistral.ai/api/
- xAI API: https://docs.x.ai/docs/api-reference
- Perplexity API: https://docs.perplexity.ai/api-reference/chat-completions-post
- Ollama OpenAI compat: https://github.com/ollama/ollama/blob/main/docs/openai.md
- vLLM OpenAI-compatible server: https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html
- LM Studio server: https://lmstudio.ai/docs/app/api
- OpenRouter docs: https://openrouter.ai/docs
- LiteLLM: https://docs.litellm.ai/

**SSE y frameworks cliente**
- W3C / WHATWG — Server-Sent Events: https://html.spec.whatwg.org/multipage/server-sent-events.html
- MDN — EventSource: https://developer.mozilla.org/en-US/docs/Web/API/EventSource
- Vercel AI SDK: https://sdk.vercel.ai/docs

**Structured output / tipado**
- Instructor: https://python.useinstructor.com/
- Pydantic AI: https://ai.pydantic.dev/
- Outlines: https://dottxt-ai.github.io/outlines/
- jsonformer: https://github.com/1rgs/jsonformer

**Proyecto de referencia**
- `peru-elecciones` (DeepSeek vía OpenAI-compatible, SSE stub): `internal/llm/deepseek.go`, `internal/llm/client.go`, `internal/api/chat.go`, `internal/api/router.go`.
