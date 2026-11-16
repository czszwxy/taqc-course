import os
from dataclasses import dataclass

DEFAULT_BASE_URL = "http://localhost:5173"
TRUE_WORDS = {"true", "1", "yes", "on"}
FALSE_WORDS = {"false", "0", "no", "off"}


@dataclass(frozen=True)
class Settings:
    base_url: str
    api_token: str
    headless: bool


def env_flag(name, default):
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return default
    word = raw.strip().lower()
    if word in TRUE_WORDS:
        return True
    if word in FALSE_WORDS:
        return False
    raise ValueError(f"{name} must be true or false, got {raw!r}")


def load_settings():
    token = os.environ.get("API_TOKEN", "").strip()
    if not token:
        raise ValueError("API_TOKEN is not set")
    return Settings(
        base_url=os.environ.get("BASE_URL", DEFAULT_BASE_URL),
        api_token=token,
        headless=env_flag("HEADLESS", True),
    )
