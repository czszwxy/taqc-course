from solution import add_tag


def test_without_tags():
    assert add_tag("smoke") == ["smoke"]


def test_calls_are_independent():
    """Другий виклик не пам'ятає перший: default None, новий список усередині."""
    add_tag("smoke")
    assert add_tag("login") == ["login"]


def test_with_tags():
    assert add_tag("cart", ["api"]) == ["api", "cart"]


def test_input_unchanged():
    """Переданий список не змінюється: tags + [tag] замість append."""
    base = ["api"]
    add_tag("cart", base)
    assert base == ["api"]
