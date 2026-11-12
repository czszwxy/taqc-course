from solution import failed_checks

EMAIL_CHECKS = {
    "not empty": lambda s: s != "",
    "has @": lambda s: "@" in s,
    "lowercase": lambda s: s == s.lower(),
}


def test_one_failed():
    """Виклич кожну перевірку: check(value), і збери назви, де False."""
    assert failed_checks("QA@example.test", EMAIL_CHECKS) == ["lowercase"]


def test_several_failed_in_order():
    assert failed_checks("", EMAIL_CHECKS) == ["not empty", "has @"]


def test_all_passed():
    assert failed_checks("qa@example.test", EMAIL_CHECKS) == []


def test_other_checks():
    """Працює з будь-якими функціями-перевірками, не лише для email."""
    price_checks = {"positive": lambda p: p > 0, "integer": lambda p: p == int(p)}
    assert failed_checks(-1.5, price_checks) == ["positive", "integer"]
