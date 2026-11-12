from solution import describe


def test_int():
    assert describe(5) == "5 is int"


def test_str_has_quotes():
    """Для рядка repr() додає лапки: '5'."""
    assert describe("5") == "'5' is str"


def test_float_and_bool():
    assert describe(2.5) == "2.5 is float"
    assert describe(True) == "True is bool"


def test_none():
    """Тип None називається NoneType."""
    assert describe(None) == "None is NoneType"
