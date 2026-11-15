"""Application configuration loaded from environment variables and .env file."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Global application settings with environment-variable overrides."""

    default_cutout_size_deg: float = 0.1
    max_cutout_size_deg: float = 1.0
    s3_bucket: str = "nasa-irsa-spherex"
    s3_region: str = "us-east-1"
    redis_url: str | None = None
    database_url: str = "sqlite+aiosqlite:///./journal.db"
    irsa_tap_url: str = "https://irsa.ipac.caltech.edu/TAP/sync"
    cache_ttl_seconds: int = 3600

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
