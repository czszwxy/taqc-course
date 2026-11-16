import pytest

from solution import Settings, load_settings, parse_bool

TOKEN = {"API_TOKEN": "t-42"}


def test_parse_bool_true_words():
    assert [parse_bool(w) for w in ["true", "1", "yes", "on"]] == [True, True, True, True]


def test_parse_bool_false_words():
    """"false", "0", "no", "off" — це False. bool("false") дав би True."""
    assert [parse_bool(w) for w in ["false", "0", "no", "off"]] == [False, False, False, False]


def test_parse_bool_ignores_case_and_spaces():
    """Порівнюй text.strip().lower() — "  FALSE " теж False."""
    assert parse_bool("  FALSE ") is False
    assert parse_bool("Yes") is True


def test_parse_bool_unknown_word():
    """Незнайоме слово — ValueError, а не мовчазне True чи False."""
    with pytest.raises(ValueError):
        parse_bool("maybe")


def test_defaults():
    """Коли задано лише токен — усе інше з типових значень."""
    assert load_settings(dict(TOKEN)) == Settings("http://localhost:5173", "t-42", True, 5000)


def test_values_from_env():
    env = {"API_TOKEN": "t-42", "BASE_URL": "https://staging.gadgetly.test", "HEADLESS": "false", "TIMEOUT_MS": "15000"}
    assert load_settings(env) == Settings("https://staging.gadgetly.test", "t-42", False, 15000)


def test_trailing_slash_removed():
    """BASE_URL з "/" в кінці: прибери його (rstrip("/")), інакше вийде //api/orders."""
    assert load_settings({**TOKEN, "BASE_URL": "https://staging.gadgetly.test/"}).base_url == "https://staging.gadgetly.test"


def test_token_missing():
    """Немає API_TOKEN — ValueError з назвою змінної в тексті."""
    with pytest.raises(ValueError, match="API_TOKEN"):
        load_settings({})


def test_token_empty():
    """Порожній або з самих пробілів токен — теж «не задано»."""
    with pytest.raises(ValueError, match="API_TOKEN"):
        load_settings({"API_TOKEN": "  "})


def test_timeout_is_int():
    """TIMEOUT_MS — рядок у оточенні; перетвори його через int()."""
    assert load_settings({**TOKEN, "TIMEOUT_MS": "7000"}).timeout_ms == 7000


def test_timeout_not_a_number():
    with pytest.raises(ValueError):
        load_settings({**TOKEN, "TIMEOUT_MS": "fast"})


def test_timeout_zero():
    """0 і від'ємні — помилка: таймаут має бути більшим за 0."""
    with pytest.raises(ValueError):
        load_settings({**TOKEN, "TIMEOUT_MS": "0"})


def test_headless_invalid():
    """HEADLESS=maybe — помилка налаштувань, а не мовчазне True."""
    with pytest.raises(ValueError):
        load_settings({**TOKEN, "HEADLESS": "maybe"})
