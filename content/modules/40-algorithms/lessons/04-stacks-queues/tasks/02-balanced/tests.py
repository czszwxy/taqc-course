import pytest

from solution import is_balanced


@pytest.mark.parametrize("text", ["f(a[1], {b: 2})", "", "no brackets at all", "{[()()]}", "Dear {name}, your order [#1002] (paid)"])
def test_balanced(text):
    assert is_balanced(text) is True


def test_wrong_kind():
    """Закривна має відповідати ВЕРХНІЙ відкривній: PAIRS[char]."""
    assert is_balanced("(]") is False


def test_wrong_nesting():
    """[(]) — кількість правильна, вкладеність ні: лічильників замало, потрібен стек."""
    assert is_balanced("[(])") is False


def test_unclosed():
    """Після циклу стек має бути порожнім: return not stack."""
    assert is_balanced("((") is False
    assert is_balanced("{[}") is False


def test_closing_first():
    """Закривна при порожньому стеку — False (і без IndexError)."""
    assert is_balanced(")(") is False
    assert is_balanced("())") is False
