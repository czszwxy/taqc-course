import pytest

from solution import Transaction


def test_changes_are_committed_on_success():
    """Без винятку — застосуй зміни: self.store.update(self.changes)."""
    store = {"stock:KB-01": 5}
    with Transaction(store) as changes:
        changes["stock:KB-01"] = 4
        changes["stock:MS-02"] = 10
    assert store == {"stock:KB-01": 4, "stock:MS-02": 10}


def test_as_gives_an_empty_changes_dict():
    """__enter__ повертає порожній словник змін (а не сам store)."""
    store = {"stock:KB-01": 5}
    with Transaction(store) as changes:
        assert changes == {}
        assert changes is not store


def test_store_is_untouched_inside_the_block():
    """Зміни копляться окремо і потрапляють у store лише в __exit__."""
    store = {"stock:KB-01": 5}
    with Transaction(store) as changes:
        changes["stock:KB-01"] = 1
        assert store == {"stock:KB-01": 5}


def test_rollback_keeps_the_store_and_the_error_propagates():
    """Виняток у блоці: store без змін, а виняток летить далі (__exit__ повертає False)."""
    store = {"stock:KB-01": 4}
    with pytest.raises(ValueError, match="payment failed"):
        with Transaction(store) as changes:
            changes["stock:KB-01"] = 0
            raise ValueError("payment failed")
    assert store == {"stock:KB-01": 4}


def test_status_through_the_lifecycle():
    """status: \"new\" → \"open\" у блоці → \"committed\"."""
    transaction = Transaction({})
    assert transaction.status == "new"
    with transaction:
        assert transaction.status == "open"
    assert transaction.status == "committed"


def test_status_after_rollback():
    """Після винятку status == \"rolled back\"."""
    transaction = Transaction({})
    with pytest.raises(RuntimeError):
        with transaction:
            raise RuntimeError("boom")
    assert transaction.status == "rolled back"
