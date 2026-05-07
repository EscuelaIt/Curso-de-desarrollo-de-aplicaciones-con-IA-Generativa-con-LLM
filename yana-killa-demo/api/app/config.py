import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
if _ENV_FILE.exists():
    load_dotenv(_ENV_FILE, override=False)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_ENV_FILE), extra="ignore")

    llm_model: str = "claude-sonnet-4-6"
    llm_models: str = "claude-sonnet-4-6"
    anthropic_api_key: str = ""
    azure_api_key: str = ""
    azure_api_base: str = ""
    gemini_api_key: str = ""
    deepseek_api_key: str = ""
    ollama_api_base: str = "http://localhost:11434"

    data_dir: str = "../data"
    docs_seed_dir: str = "../docs-piloto"
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # Piloto remoto: si pilot_token está vacío, la auth queda desactivada (modo local dev).
    pilot_token: str = ""
    allowed_origins: str = ""
    rate_limit_chat_per_hour: int = 120
    rate_limit_ingest_per_hour: int = 30
    max_upload_mb: int = 50


settings = Settings()


def _sync_to_env(keys: dict[str, str]) -> None:
    for env_key, value in keys.items():
        if value and not os.environ.get(env_key):
            os.environ[env_key] = value


_sync_to_env({
    "ANTHROPIC_API_KEY": settings.anthropic_api_key,
    "AZURE_API_KEY": settings.azure_api_key,
    "AZURE_API_BASE": settings.azure_api_base,
    "GEMINI_API_KEY": settings.gemini_api_key,
    "DEEPSEEK_API_KEY": settings.deepseek_api_key,
    "OLLAMA_API_BASE": settings.ollama_api_base,
})
