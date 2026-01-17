import os
from functools import lru_cache
from typing import List, Optional

from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    bot_token: str = ""
    backend_url: str = ""
    database_url: str = "sqlite:///./trades.db"
    cors_origins: List[str] = ["*"]
    mini_app_url: str = ""
    pear_api_url: str = ""

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()] or ["*"]
        return v or ["*"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
