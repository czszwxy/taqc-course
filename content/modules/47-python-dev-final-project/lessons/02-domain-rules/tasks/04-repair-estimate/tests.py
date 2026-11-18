import dataclasses

import pytest

from solution import Estimate, Part, estimate

SCREEN = Part("screen", 2400)
BATTERY = Part("battery", 900)
GLASS = Part("back glass", 300, accidental=True)


def test_estimate_is_a_frozen_dataclass():
    """Estimate — @dataclass(frozen=True) з полями parts_total, labour_total, total."""
    result = Estimate(1, 2, 3)
    assert [field.name for field in dataclasses.fields(Estimate)] == ["parts_total", "labour_total", "total"]
    with pytest.raises(dataclasses.FrozenInstanceError):
        result.total = 0


def test_parts_and_labour():
    """2400 + 900 за деталі; 60 хвилин = 4 блоки по 15 хв × 150 = 600."""
    assert estimate([SCREEN, BATTERY], 60, False) == Estimate(3300, 600, 3900)


@pytest.mark.parametrize(
    ("minutes", "labour"),
    [(0, 0), (1, 150), (14, 150), (15, 150), (16, 300), (50, 600), (90, 900)],
)
def test_labour_is_billed_per_started_block(minutes, labour):
    """Кожен розпочатий блок у 15 хвилин — 150 грн: 16 хв — уже два блоки (округлення вгору, math.ceil)."""
    assert estimate([], minutes, False).labour_total == labour


def test_no_parts():
    assert estimate([], 30, False) == Estimate(0, 300, 300)


def test_warranty_covers_parts_and_labour():
    """За гарантією клієнт не платить ні за роботу, ні за звичайні деталі."""
    assert estimate([SCREEN, BATTERY], 90, True) == Estimate(0, 0, 0)


def test_accidental_damage_is_paid_under_warranty():
    """Деталь, пошкоджену з вини клієнта (accidental=True), гарантія не покриває — лише роботу."""
    assert estimate([SCREEN, GLASS], 45, True) == Estimate(300, 0, 300)


def test_accidental_part_without_warranty():
    """Без гарантії accidental нічого не змінює — платні всі деталі."""
    assert estimate([SCREEN, GLASS], 0, False) == Estimate(2700, 0, 2700)


def test_free_part():
    """Деталь за 0 грн — нормальна ситуація (наприклад, гвинт), не помилка."""
    assert estimate([Part("screw", 0)], 15, False) == Estimate(0, 150, 150)


def test_negative_minutes():
    with pytest.raises(ValueError):
        estimate([], -1, False)


def test_negative_price_names_the_part():
    """Від'ємна ціна — ValueError з назвою деталі в повідомленні."""
    with pytest.raises(ValueError, match="battery"):
        estimate([SCREEN, Part("battery", -5)], 15, False)


def test_negative_price_is_rejected_under_warranty_too():
    """Перевіряй ціну завжди, а не лише коли деталь платна."""
    with pytest.raises(ValueError, match="battery"):
        estimate([Part("battery", -5)], 15, True)


def test_parts_are_not_changed():
    parts = [SCREEN, GLASS]
    estimate(parts, 30, True)
    assert parts == [SCREEN, GLASS]
