from datetime import date

import pytest

from subject import Estimate, Part, due_date, estimate, is_overdue

MONDAY = date(2026, 11, 16)


def test_normal_priority_from_monday():
    # День прийому не рахується: пн + 3 робочі дні = чт.
    assert due_date(MONDAY, "normal") == date(2026, 11, 19)


# твій код тут
