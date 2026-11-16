from dataclasses import dataclass

DEFAULT_BASE_URL = "http://localhost:5173"
DEFAULT_TIMEOUT_MS = 5000
TRUE_WORDS = {"true", "1", "yes", "on"}
FALSE_WORDS = {"false", "0", "no", "off"}


@dataclass(frozen=True)
class Settings:
    base_url: str
    api_token: str
    headless: bool
    timeout_ms: int


def parse_bool(text: str) -> bool:
    # твій код тут
    pass


def load_settings(env: dict[str, str]) -> Settings:
    # твій код тут
    pass
