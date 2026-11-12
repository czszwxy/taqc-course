from solution import format_result


def test_rounded_percent():
    """Відсоток з одним знаком після коми: f\"{percent:.1f}\"."""
    assert format_result("login", 12, 13) == "login: 12/13 passed (92.3%)"


def test_all_passed():
    """100 відсотків теж з одним знаком: 100.0%."""
    assert format_result("checkout", 5, 5) == "checkout: 5/5 passed (100.0%)"


def test_none_passed():
    assert format_result("search", 0, 4) == "search: 0/4 passed (0.0%)"
