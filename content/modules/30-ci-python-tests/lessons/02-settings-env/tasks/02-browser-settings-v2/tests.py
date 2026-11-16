import pytest

from solution import BrowserSettings, load_browser_settings, parse_viewport


def test_parse_viewport():
    assert parse_viewport("1280x720") == (1280, 720)


def test_parse_viewport_case_and_spaces():
    """"390X844" з великою X і пробілами — теж правильний формат."""
    assert parse_viewport(" 390X844 ") == (390, 844)


def test_parse_viewport_bad_format():
    """Без "x" або з трьома частинами — ValueError."""
    with pytest.raises(ValueError):
        parse_viewport("1280")
    with pytest.raises(ValueError):
        parse_viewport("1x2x3")


def test_parse_viewport_not_numbers():
    with pytest.raises(ValueError):
        parse_viewport("wide x tall")


def test_parse_viewport_zero():
    """Ширина чи висота 0 або менше — помилка."""
    with pytest.raises(ValueError):
        parse_viewport("0x720")


def test_defaults():
    assert load_browser_settings({}) == BrowserSettings("chromium", 0, (1280, 720))


def test_values_from_env():
    env = {"BROWSER": "webkit", "SLOW_MO_MS": "250", "VIEWPORT": "390x844"}
    assert load_browser_settings(env) == BrowserSettings("webkit", 250, (390, 844))


def test_browser_case_insensitive():
    """"Firefox" → "firefox": приведи назву до нижнього регістру."""
    assert load_browser_settings({"BROWSER": "Firefox"}).browser == "firefox"


def test_unknown_browser():
    """Невідомий браузер — ValueError з його назвою в тексті."""
    with pytest.raises(ValueError, match="safari"):
        load_browser_settings({"BROWSER": "safari"})


def test_slow_mo_negative():
    """int("-5") не падає — перевір від'ємне значення окремо."""
    with pytest.raises(ValueError):
        load_browser_settings({"SLOW_MO_MS": "-5"})


def test_slow_mo_not_a_number():
    with pytest.raises(ValueError):
        load_browser_settings({"SLOW_MO_MS": "slow"})
