"""
Application configuration using Pydantic settings.
"""

# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    DATABASE_URL: str = "postgresql://evaluator:evaluator_dev@localhost:5433/evaluator"

    # JWT Settings
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # LLM — any OpenAI-compatible endpoint (UF Navigator, OpenAI, etc.)
    LLM_API_KEY: str = ""
    LLM_BASE_URL: str = "https://api.ai.it.ufl.edu/v1/"  # UF Navigator
    LLM_MODEL: str = "llama-3.1-8b-instruct"
    LLM_QUALITY_MODEL: str = "llama-3.3-70b-instruct"  # stronger model for wrap-up / evaluation

    # LLM Behaviour
    LLM_MAX_RETRIES: int = 2          # retry on bad JSON
    LLM_STAGE_MAX_TURNS: int = 5      # safety-valve: force-advance after N turns

    # Session Time Limits
    SESSION_TIME_LIMIT_SECONDS: int = 600     # 10 minutes total
    SESSION_WRAP_UP_THRESHOLD: float = 0.7    # start time-aware hints at 70% of limit

    # App Settings
    DEBUG: bool = False

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
