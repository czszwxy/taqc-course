import pytest

from solution import IdempotencyConflict, IdempotencyStore

DAY = 86400


class Clock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


class Charge:
    def __init__(self):
        self.calls = 0

    def __call__(self):
        self.calls += 1
        return {"payment_id": self.calls, "status": "succeeded"}


@pytest.fixture
def clock():
    return Clock()


@pytest.fixture
def store(clock):
    return IdempotencyStore(ttl_seconds=DAY, clock=clock)


def test_first_call_runs_action(store):
    charge = Charge()
    assert store.run("key-1", {"order": 1002, "amount": 899}, charge) == {"payment_id": 1, "status": "succeeded"}
    assert charge.calls == 1


def test_repeat_returns_saved_result(store):
    """Повтор з тим самим ключем і payload — той самий результат без повторного списання."""
    charge = Charge()
    first = store.run("key-1", {"order": 1002, "amount": 899}, charge)
    second = store.run("key-1", {"amount": 899, "order": 1002}, charge)
    assert second == first
    assert charge.calls == 1


def test_other_payload_is_conflict(store):
    """Той самий ключ з іншим payload — IdempotencyConflict, а не старий результат."""
    charge = Charge()
    store.run("key-1", {"order": 1002, "amount": 899}, charge)
    with pytest.raises(IdempotencyConflict):
        store.run("key-1", {"order": 1002, "amount": 1}, charge)
    assert charge.calls == 1


def test_different_keys_are_independent(store):
    charge = Charge()
    store.run("key-1", {"order": 1002, "amount": 899}, charge)
    assert store.run("key-2", {"order": 1002, "amount": 899}, charge)["payment_id"] == 2


def test_failed_action_is_not_saved(store):
    """Якщо action кинув виняток, нічого не зберігай — повтор з тим самим ключем має виконатися."""
    attempts = []

    def flaky():
        attempts.append(1)
        if len(attempts) == 1:
            raise TimeoutError("bank did not answer")
        return {"payment_id": 7, "status": "succeeded"}

    with pytest.raises(TimeoutError):
        store.run("key-1", {"order": 1002}, flaky)
    assert store.run("key-1", {"order": 1002}, flaky) == {"payment_id": 7, "status": "succeeded"}
    assert len(attempts) == 2


def test_expired_key_is_new_again(store, clock):
    """Через ttl секунд запис забутий (межа включно: clock() - saved_at >= ttl)."""
    charge = Charge()
    store.run("key-1", {"order": 1002}, charge)
    clock.now += DAY - 1
    store.run("key-1", {"order": 1002}, charge)
    assert charge.calls == 1
    clock.now += 1
    store.run("key-1", {"order": 1002}, charge)
    assert charge.calls == 2


def test_expired_key_with_other_payload_is_fine(store, clock):
    """Забутий ключ можна використати з новим payload."""
    charge = Charge()
    store.run("key-1", {"order": 1002}, charge)
    clock.now += DAY
    assert store.run("key-1", {"order": 1003}, charge)["payment_id"] == 2


def test_later_change_of_payload_dict_does_not_matter(store):
    """Збережи копію payload: якщо клієнт потім змінить свій словник, повтор усе одно впізнається."""
    charge = Charge()
    payload = {"order": 1002, "amount": 899}
    store.run("key-1", payload, charge)
    payload["amount"] = 1
    assert store.run("key-1", {"order": 1002, "amount": 899}, charge)["payment_id"] == 1


@pytest.mark.parametrize("key", ["", "   "])
def test_empty_key(store, key):
    with pytest.raises(ValueError):
        store.run(key, {"order": 1002}, Charge())
