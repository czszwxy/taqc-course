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
    word = text.strip().lower()
    if word in TRUE_WORDS:
        return True
    if word in FALSE_WORDS:
        return False
    raise ValueError(f"expected true or false, got {text!r}")


def load_settings(env: dict[str, str]) -> Settings:
    token = env.get("API_TOKEN", "").strip()
    if not token:
        raise ValueError("API_TOKEN is not set")

    timeout_ms = int(env.get("TIMEOUT_MS", str(DEFAULT_TIMEOUT_MS)))
    if timeout_ms <= 0:
        raise ValueError(f"TIMEOUT_MS must be greater than 0, got {timeout_ms}")

    headless_text = env.get("HEADLESS")
    headless = True if headless_text is None else parse_bool(headless_text)

    return Settings(
        base_url=env.get("BASE_URL", DEFAULT_BASE_URL).rstrip("/"),
        api_token=token,
        headless=headless,
        timeout_ms=timeout_ms,
    )
