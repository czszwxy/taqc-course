from dataclasses import dataclass


@dataclass(frozen=True)
class PercentOff:
    percent: int


@dataclass(frozen=True)
class FixedOff:
    amount: int


@dataclass(frozen=True)
class MinTotal:
    minimum: int
    rule: object
