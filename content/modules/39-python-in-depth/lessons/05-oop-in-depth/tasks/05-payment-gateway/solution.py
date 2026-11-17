from abc import ABC, abstractmethod


class PaymentGateway(ABC):
    @abstractmethod
    def charge(self, amount): ...

    def pay(self, amount):
        if amount <= 0:
            raise ValueError("amount must be positive")
        return self.charge(amount)


class FakeGateway(PaymentGateway):
    def __init__(self):
        self.charges = []

    def charge(self, amount):
        self.charges.append(amount)
        return f"ch_{len(self.charges)}"
