from solution import clean_names


def test_cleans():
    assert clean_names([" Login ", "", "CART", "   ", "Search"]) == ["login", "cart", "search"]


def test_whitespace_only_removed():
    """Рядок з самих пробілів після strip стає порожнім — фільтруй після strip."""
    assert clean_names(["   ", "\t"]) == []


def test_returns_list():
    """map і filter ледачі — загорни результат у list(...)."""
    assert isinstance(clean_names(["a"]), list)


def test_empty():
    assert clean_names([]) == []
