import pytest

from subject import load_settings


def test_token_from_env(monkeypatch):
    monkeypatch.setenv("API_TOKEN", "t-42")
    assert load_settings().api_token == "t-42"


def test_default_base_url(monkeypatch):
    monkeypatch.setenv("API_TOKEN", "t-42")
    monkeypatch.delenv("BASE_URL", raising=False)
    assert load_settings().base_url == "http://localhost:5173"


def test_trailing_slash_removed(monkeypatch):
    monkeypatch.setenv("API_TOKEN", "t-42")
    monkeypatch.setenv("BASE_URL", "https://staging.gadgetly.test/")
    assert load_settings().base_url == "https://staging.gadgetly.test"


def test_token_is_required(monkeypatch):
    monkeypatch.delenv("API_TOKEN", raising=False)
    with pytest.raises(ValueError, match="API_TOKEN"):
        load_settings()


@pytest.mark.parametrize("word, expected", [("false", False), ("FALSE", False), ("Yes", True), ("0", False)])
def test_headless_words(monkeypatch, word, expected):
    monkeypatch.setenv("API_TOKEN", "t-42")
    monkeypatch.setenv("HEADLESS", word)
    assert load_settings().headless is expected


def test_headless_default(monkeypatch):
    monkeypatch.setenv("API_TOKEN", "t-42")
    monkeypatch.delenv("HEADLESS", raising=False)
    assert load_settings().headless is True


def test_headless_unknown_word(monkeypatch):
    monkeypatch.setenv("API_TOKEN", "t-42")
    monkeypatch.setenv("HEADLESS", "maybe")
    with pytest.raises(ValueError):
        load_settings()
