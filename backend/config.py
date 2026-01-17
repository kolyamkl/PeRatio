import os
from functools import lru_cache
from typing import List, Optional

from pydantic import AnyHttpUrl, validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    bot_token: str = os.environ.get("BOT_TOKEN", "")
    backend_url: Optional[AnyHttpUrl] = None
    database_url: str = os.environ.get("DATABASE_URL", "sqlite:///./trades.db")
    cors_origins: List[str] = ["*"]
    mini_app_url: Optional[AnyHttpUrl] = None
    pear_api_url: Optional[AnyHttpUrl] = None
    cors_origins_raw: str = os.environ.get("CORS_ORIGINS", "")

    @validator("cors_origins", pre=True, always=True)
    def split_origins(cls, v, values):  # noqa: N805
        raw = values.get("cors_origins_raw") or ""
        if isinstance(v, list) and v:
            return v
        if not raw:
            return ["*"]
        parsed = [o.strip() for o in raw.split(",") if o.strip()]
        return parsed or ["*"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
