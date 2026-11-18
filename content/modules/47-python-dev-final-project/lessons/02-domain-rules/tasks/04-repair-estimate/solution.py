import math
from dataclasses import dataclass

LABOUR_BLOCK_MINUTES = 15
LABOUR_BLOCK_PRICE = 150


@dataclass(frozen=True)
class Part:
    name: str
    price: int
    accidental: bool = False


@dataclass(frozen=True)
class Estimate:
    parts_total: int
    labour_total: int
    total: int


def estimate(parts, labour_minutes, under_warranty):
    if labour_minutes < 0:
        raise ValueError("labour_minutes must not be negative")
    parts_total = 0
    for part in parts:
        if part.price < 0:
            raise ValueError(f"negative price: {part.name}")
        if not under_warranty or part.accidental:
            parts_total += part.price
    labour_total = 0
    if not under_warranty:
        labour_total = math.ceil(labour_minutes / LABOUR_BLOCK_MINUTES) * LABOUR_BLOCK_PRICE
    return Estimate(parts_total, labour_total, parts_total + labour_total)
