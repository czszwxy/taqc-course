import math
from dataclasses import dataclass

LABOUR_BLOCK_MINUTES = 15
LABOUR_BLOCK_PRICE = 150


@dataclass(frozen=True)
class Part:
    name: str
    price: int
    accidental: bool = False


# твій код тут: dataclass Estimate


def estimate(parts, labour_minutes, under_warranty):
    # твій код тут
    pass
