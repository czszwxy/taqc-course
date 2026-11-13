import dataclasses

import pytest

from solution import Settings, for_debug


def test_defaults():
    settings = Settings("https://staging.example.test")
    assert settings.timeout == 5
    assert settings.headless is True


def test_is_frozen():
    """frozen=True: зміна поля — FrozenInstanceError."""
    settings = Settings("https://staging.example.test")
    with pytest.raises(dataclasses.FrozenInstanceError):
        settings.timeout = 10


def test_for_debug():
    debug = for_debug(Settings("https://staging.example.test", timeout=10))
    assert debug == Settings("https://staging.example.test", timeout=30, headless=False)


def test_original_unchanged():
    """for_debug повертає нову копію (replace), оригінал не змінюється."""
    ci = Settings("https://staging.example.test")
    for_debug(ci)
    assert ci == Settings("https://staging.example.test")
