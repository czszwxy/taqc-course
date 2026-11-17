import pytest

from solution import audit


def test_successful_block():
    """Перед блоком — \"start …\", після успіху — \"ok …\"."""
    log = []
    with audit(log, "refund #3001"):
        pass
    assert log == ["start refund #3001", "ok refund #3001"]


def test_start_is_written_before_the_block_runs():
    """Код до yield — це вхід: start записано ще до тіла with."""
    log = []
    with audit(log, "export"):
        assert log == ["start export"]


def test_failed_block_is_logged_and_the_error_propagates():
    """except Exception as error: запиши fail з type(error).__name__ і зроби raise — виняток не можна ковтати."""
    log = []
    with pytest.raises(TimeoutError, match="gateway"):
        with audit(log, "charge #3002"):
            raise TimeoutError("gateway did not answer")
    assert log == ["start charge #3002", "fail charge #3002: TimeoutError"]


def test_ok_is_not_written_after_a_failure():
    """\"ok …\" — лише в гілці else, тобто тільки після успішного блоку."""
    log = []
    with pytest.raises(KeyError):
        with audit(log, "lookup"):
            raise KeyError("sku")
    assert "ok lookup" not in log


def test_nested_audits():
    """Вкладені менеджери: зовнішній входить першим і виходить останнім."""
    log = []
    with audit(log, "order"):
        with audit(log, "payment"):
            pass
    assert log == ["start order", "start payment", "ok payment", "ok order"]
