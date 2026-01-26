import os
from functools import lru_cache
from typing import List, Optional

from pydantic import computed_field, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    bot_token: str = ""
    backend_url: str = ""
    database_url: str = "postgresql://user:password@localhost:5432/tg_trade"
    cors_origins: str = "*"
    mini_app_url: str = ""
    
    # OpenAI settings
    openai_api_key: str = ""
    
    # Pear Protocol settings
    pear_api_url: str = "https://hl-v2.pearprotocol.io"
    pear_client_id: str = "HLHackathon9"
    pear_private_key: str = ""
    pear_user_wallet: str = ""
    pear_agent_wallet: str = ""
    pear_access_token: str = ""
    
    # Pear Agent API settings (https://api.pear.garden)
    pear_agent_api_key: str = ""  # API key for Pear Agent signals
    use_pear_agent_api: bool = True  # Toggle to use Pear Agent API for signals
    pear_agent_fallback_to_llm: bool = True  # Fallback to LLM if Pear API fails

    def get_cors_list(self) -> List[str]:
        """Parse CORS origins from string"""
        if not self.cors_origins or self.cors_origins == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
