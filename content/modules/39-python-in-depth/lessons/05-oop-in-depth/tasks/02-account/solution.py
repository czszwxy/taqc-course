class Account:
    def __init__(self, owner, balance=0):
        if balance < 0:
            raise ValueError("balance must not be negative")
        self.owner = owner
        self._balance = balance

    @property
    def owner(self):
        return self._owner

    @owner.setter
    def owner(self, value):
        value = value.strip()
        if not value:
            raise ValueError("owner must not be empty")
        self._owner = value

    @property
    def balance(self):
        return self._balance

    def deposit(self, amount):
        self._check_amount(amount)
        self._balance += amount
        return self._balance

    def withdraw(self, amount):
        self._check_amount(amount)
        if amount > self._balance:
            raise ValueError("insufficient funds")
        self._balance -= amount
        return self._balance

    @staticmethod
    def _check_amount(amount):
        if amount <= 0:
            raise ValueError("amount must be positive")
