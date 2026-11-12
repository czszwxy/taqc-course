from solution import normalize_phone


def test_full_format():
    """Прибери пробіли, дужки й дефіси."""
    assert normalize_phone(" +38 (067) 123-45-67 ") == "+380671234567"


def test_dashes_only():
    assert normalize_phone("067-123-45-67") == "0671234567"


def test_already_clean():
    assert normalize_phone("0671234567") == "0671234567"
