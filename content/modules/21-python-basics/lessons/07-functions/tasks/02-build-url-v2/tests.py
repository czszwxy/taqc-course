from solution import search_url


def test_defaults():
    """Значення за замовчуванням: page=1, sort="relevance"; пробіли в запиті → +."""
    assert search_url("https://shop.test", "usb cable") == "https://shop.test/search?q=usb+cable&page=1&sort=relevance"


def test_keyword_arguments():
    assert search_url("https://shop.test", "mouse", sort="price", page=3) == "https://shop.test/search?q=mouse&page=3&sort=price"


def test_cleans_base_and_query():
    """Прибери / у кінці base і пробіли по краях запиту."""
    assert search_url("https://shop.test/", " mouse ") == "https://shop.test/search?q=mouse&page=1&sort=relevance"
