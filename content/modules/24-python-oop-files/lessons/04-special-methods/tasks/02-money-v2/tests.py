from solution import Version


def test_numeric_comparison():
    """Порівнюй числа, а не рядки: (1, 10, 0) > (1, 9, 9)."""
    assert Version("1.10.0") > Version("1.9.9")
    assert Version("1.2.0") < Version("1.10.0")


def test_equal():
    assert Version("2.0.1") == Version("2.0.1")
    assert Version("2.0.1") != Version("2.0.2")


def test_sorted():
    versions = [Version("1.10.0"), Version("1.2.0"), Version("1.9.3")]
    assert sorted(versions) == [Version("1.2.0"), Version("1.9.3"), Version("1.10.0")]


def test_repr():
    assert repr(Version("1.10.0")) == "Version('1.10.0')"


def test_other_type():
    assert Version("1.0.0") != "1.0.0"
