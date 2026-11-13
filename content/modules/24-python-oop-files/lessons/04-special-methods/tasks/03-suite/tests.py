from solution import Suite


def make_suite():
    smoke = Suite("smoke")
    smoke.add("test_login")
    smoke.add("test_cart")
    smoke.add("test_login")
    return smoke


def test_len_ignores_duplicates():
    """len() викликає __len__; дублікати в add не додавай."""
    assert len(make_suite()) == 2


def test_contains():
    """`in` викликає __contains__."""
    smoke = make_suite()
    assert "test_cart" in smoke
    assert "test_search" not in smoke


def test_iteration_order():
    """for і list() викликають __iter__."""
    assert list(make_suite()) == ["test_login", "test_cart"]


def test_repr():
    assert repr(make_suite()) == "Suite('smoke', 2 tests)"


def test_empty_suite_is_falsy():
    """Об'єкт з __len__ == 0 хибний."""
    assert not Suite("empty")
