from typing import AsyncIterator, List
import litellm
from ..config import settings

async def stream_completion(
    model: str,
    messages: list[dict],
    temperature: float = 0.2,
) -> AsyncIterator[str]:
    response = await litellm.acompletion(
        model=model,
        messages=messages,
        temperature=temperature,
        stream=True,
    )
    async for chunk in response:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta

async def complete(
    model: str,
    messages: list[dict],
    temperature: float = 0.2,
) -> str:
    response = await litellm.acompletion(
        model=model,
        messages=messages,
        temperature=temperature,
    )
    return response.choices[0].message.content

def available_models() -> List[str]:
    return [m.strip() for m in settings.llm_models.split(",") if m.strip()]
