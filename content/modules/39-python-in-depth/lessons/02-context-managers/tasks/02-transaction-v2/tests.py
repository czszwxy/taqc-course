import pytest

from solution import TemporaryOverride


def test_values_are_overridden_inside_the_block():
    """На вході: settings.update(overrides); as отримує сам словник settings."""
    settings = {"debug": False, "timeout": 30}
    with TemporaryOverride(settings, debug=True) as current:
        assert current is settings
        assert settings == {"debug": True, "timeout": 30}


def test_old_values_come_back():
    """На виході відновлюй значення, що були до входу."""
    settings = {"debug": False, "timeout": 30}
    with TemporaryOverride(settings, debug=True, timeout=5):
        pass
    assert settings == {"debug": False, "timeout": 30}


def test_new_keys_are_removed():
    """Ключі, яких не було до входу, після виходу треба видалити."""
    settings = {"debug": False}
    with TemporaryOverride(settings, region="eu"):
        assert settings["region"] == "eu"
    assert settings == {"debug": False}


def test_restored_after_an_error_and_the_error_propagates():
    """__exit__ виконується завжди: відновлення — навіть після винятку; return False не ховає виняток."""
    settings = {"debug": False}
    with pytest.raises(ZeroDivisionError):
        with TemporaryOverride(settings, debug=True, region="eu"):
            1 / 0
    assert settings == {"debug": False}


def test_key_deleted_inside_the_block_does_not_break_exit():
    """settings.pop(key, None) не падає, якщо ключ уже видалили в блоці."""
    settings = {}
    with TemporaryOverride(settings, region="eu"):
        del settings["region"]
    assert settings == {}
