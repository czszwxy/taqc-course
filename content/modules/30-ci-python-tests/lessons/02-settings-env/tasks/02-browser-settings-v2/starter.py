from dataclasses import dataclass

BROWSERS = {"chromium", "firefox", "webkit"}
DEFAULT_VIEWPORT = (1280, 720)


@dataclass(frozen=True)
class BrowserSettings:
    browser: str
    slow_mo_ms: int
    viewport: tuple[int, int]


def parse_viewport(text: str) -> tuple[int, int]:
    # твій код тут
    pass


def load_browser_settings(env: dict[str, str]) -> BrowserSettings:
    # твій код тут
    pass
