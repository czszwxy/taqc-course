from dataclasses import dataclass

BROWSERS = {"chromium", "firefox", "webkit"}
DEFAULT_VIEWPORT = (1280, 720)


@dataclass(frozen=True)
class BrowserSettings:
    browser: str
    slow_mo_ms: int
    viewport: tuple[int, int]


def parse_viewport(text: str) -> tuple[int, int]:
    parts = text.strip().lower().split("x")
    if len(parts) != 2:
        raise ValueError(f"viewport must look like 1280x720, got {text!r}")
    width, height = int(parts[0]), int(parts[1])
    if width <= 0 or height <= 0:
        raise ValueError(f"viewport sizes must be positive, got {text!r}")
    return (width, height)


def load_browser_settings(env: dict[str, str]) -> BrowserSettings:
    browser = env.get("BROWSER", "chromium").strip().lower()
    if browser not in BROWSERS:
        raise ValueError(f"unknown browser {browser!r}")

    slow_mo_ms = int(env.get("SLOW_MO_MS", "0"))
    if slow_mo_ms < 0:
        raise ValueError(f"SLOW_MO_MS cannot be negative, got {slow_mo_ms}")

    viewport_text = env.get("VIEWPORT")
    viewport = DEFAULT_VIEWPORT if viewport_text is None else parse_viewport(viewport_text)

    return BrowserSettings(browser=browser, slow_mo_ms=slow_mo_ms, viewport=viewport)
