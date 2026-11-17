import pytest

from solution import FakeGateway, PaymentGateway


def test_abstract_gateway_cannot_be_created():
    """PaymentGateway(ABC) з @abstractmethod charge не створюється: TypeError."""
    with pytest.raises(TypeError):
        PaymentGateway()


def test_subclass_without_charge_cannot_be_created():
    """Нащадок, що не реалізував charge, теж абстрактний."""

    class BrokenGateway(PaymentGateway):
        pass

    with pytest.raises(TypeError):
        BrokenGateway()


def test_fake_gateway_returns_payment_ids():
    gateway = FakeGateway()
    assert gateway.pay(499) == "ch_1"
    assert gateway.pay(1299) == "ch_2"
    assert gateway.charges == [499, 1299]


def test_fake_gateway_is_a_payment_gateway():
    assert isinstance(FakeGateway(), PaymentGateway)


def test_pay_rejects_non_positive_amounts_without_charging():
    """Перевірка в pay — до виклику charge: нічого не має списатися."""
    gateway = FakeGateway()
    with pytest.raises(ValueError, match="amount must be positive"):
        gateway.pay(0)
    assert gateway.charges == []


def test_each_fake_has_its_own_charges():
    """self.charges = [] у __init__, а не атрибут класу, спільний для всіх."""
    first = FakeGateway()
    first.pay(100)
    assert FakeGateway().charges == []


def test_pay_works_with_any_implementation():
    """pay написаний один раз у базовому класі й викликає self.charge конкретного нащадка."""

    class FixedGateway(PaymentGateway):
        def charge(self, amount):
            return f"fixed-{amount}"

    assert FixedGateway().pay(10) == "fixed-10"
