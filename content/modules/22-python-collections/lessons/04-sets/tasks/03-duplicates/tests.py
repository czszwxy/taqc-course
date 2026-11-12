from solution import duplicates


def test_finds_duplicates():
    assert duplicates(["a@x.com", "b@x.com", "a@x.com", "c@x.com", "b@x.com"]) == {"a@x.com", "b@x.com"}


def test_triple_listed_once():
    """Значення тричі — у результаті один раз (це множина)."""
    assert duplicates(["x", "x", "x"]) == {"x"}


def test_no_duplicates():
    """Без дублікатів — порожня множина set()."""
    assert duplicates(["one", "two"]) == set()


def test_empty():
    assert duplicates([]) == set()
