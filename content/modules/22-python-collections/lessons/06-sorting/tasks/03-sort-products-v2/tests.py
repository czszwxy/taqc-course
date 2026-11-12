from solution import top_rated


def test_by_rating():
    products = [
        {"name": "mouse", "rating": 4.5},
        {"name": "Cable", "rating": 4.8},
        {"name": "Adapter", "rating": 4.5},
    ]
    assert top_rated(products) == ["Cable", "Adapter", "mouse"]


def test_tie_by_name_ascending():
    """При рівному рейтингу назви — за зростанням: мінус лише для рейтингу, не reverse=True."""
    products = [{"name": "Banana", "rating": 4.0}, {"name": "apple", "rating": 4.0}]
    assert top_rated(products) == ["apple", "Banana"]


def test_empty():
    assert top_rated([]) == []
