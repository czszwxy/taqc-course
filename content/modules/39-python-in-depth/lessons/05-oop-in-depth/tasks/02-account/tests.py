import pytest

from solution import Account


def test_owner_is_stripped():
    """Setter owner обрізає пробіли: value.strip()."""
    assert Account("  Olena Shevchenko ", 100).owner == "Olena Shevchenko"


def test_empty_owner_is_rejected_in_the_constructor():
    """У __init__ присвоюй через self.owner = owner — тоді перевірка setter спрацює й тут."""
    with pytest.raises(ValueError, match="owner must not be empty"):
        Account("   ")


def test_owner_can_be_changed_with_validation():
    account = Account("Olena")
    account.owner = " Ivan "
    assert account.owner == "Ivan"
    with pytest.raises(ValueError, match="owner must not be empty"):
        account.owner = ""
    assert account.owner == "Ivan"


def test_balance_is_read_only():
    """balance — @property без setter: присвоєння дає AttributeError."""
    account = Account("Olena", 100)
    with pytest.raises(AttributeError):
        account.balance = 1_000_000
    assert account.balance == 100


def test_default_balance_is_zero():
    assert Account("Olena").balance == 0


def test_negative_start_balance_is_rejected():
    with pytest.raises(ValueError, match="balance must not be negative"):
        Account("Olena", -1)


def test_deposit_and_withdraw_return_the_new_balance():
    account = Account("Olena", 100)
    assert account.deposit(50) == 150
    assert account.withdraw(30) == 120
    assert account.balance == 120


def test_cannot_withdraw_more_than_the_balance():
    """Перевір суму до зміни балансу: невдала операція нічого не змінює."""
    account = Account("Olena", 100)
    with pytest.raises(ValueError, match="insufficient funds"):
        account.withdraw(101)
    assert account.balance == 100


def test_withdraw_the_whole_balance():
    """Межа: зняти рівно стільки, скільки є, — можна."""
    assert Account("Olena", 100).withdraw(100) == 0


@pytest.mark.parametrize("amount", [0, -10])
def test_amount_must_be_positive(amount):
    """amount <= 0 → ValueError(\"amount must be positive\") і для deposit, і для withdraw."""
    account = Account("Olena", 100)
    with pytest.raises(ValueError, match="amount must be positive"):
        account.deposit(amount)
    with pytest.raises(ValueError, match="amount must be positive"):
        account.withdraw(amount)
