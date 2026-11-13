from dataclasses import dataclass, replace


@dataclass(frozen=True)
class Settings:
    base_url: str
    timeout: int = 5
    headless: bool = True


def for_debug(settings: Settings) -> Settings:
    return replace(settings, headless=False, timeout=30)
