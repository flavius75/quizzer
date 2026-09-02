"""Centralized, validated application configuration.

All environment variables are read here, once, at import time. A missing or
malformed required variable raises immediately (fail-fast) instead of
surfacing as a confusing error on the first request that needs it.
"""
import os
from dotenv import load_dotenv

load_dotenv()


def _require(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def _get_bool(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")


def _get_int(name: str, default: int) -> int:
    value = os.environ.get(name)
    if value is None or not value.strip():
        return default
    try:
        return int(value.strip())
    except ValueError as exc:
        raise RuntimeError(f"Environment variable {name} must be an integer, got: {value!r}") from exc


class Settings:
    DATABASE_URL: str = _require("DATABASE_URL")
    SECRET_KEY: str = _require("SECRET_KEY")
    ALGORITHM: str = os.environ.get("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = _get_int("ACCESS_TOKEN_EXPIRE_MINUTES", 60)

    # False in production by default; set DEBUG=true locally for API docs,
    # verbose errors, and non-secure cookies over plain HTTP.
    DEBUG: bool = _get_bool("DEBUG", False)

    # Comma-separated list of allowed origins, e.g. "https://app.example.com,https://example.com".
    # No wildcard fallback: credentialed CORS with "*" is a vulnerability, so an
    # empty/unset value in production intentionally allows no cross-origin browser access.
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.environ.get("CORS_ORIGINS", "").split(",")
        if origin.strip()
    ] or (["http://localhost:5173", "http://localhost:3000"] if DEBUG else [])


settings = Settings()
