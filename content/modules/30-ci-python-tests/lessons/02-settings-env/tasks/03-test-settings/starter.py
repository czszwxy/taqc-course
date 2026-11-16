import pytest

from subject import load_settings


def test_token_from_env(monkeypatch):
    monkeypatch.setenv("API_TOKEN", "t-42")
    assert load_settings().api_token == "t-42"


# твій код тут
