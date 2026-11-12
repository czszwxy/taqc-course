from itertools import islice

from solution import unique_emails


def test_next():
    """Нумерація з 1: збільш лічильник перед yield."""
    emails = unique_emails("buyer", "test.dev")
    assert next(emails) == "buyer1@test.dev"
    assert next(emails) == "buyer2@test.dev"


def test_islice():
    assert list(islice(unique_emails("qa", "x.dev"), 3)) == ["qa1@x.dev", "qa2@x.dev", "qa3@x.dev"]


def test_many():
    """Генератор нескінченний: while True."""
    emails = list(islice(unique_emails("u", "t.dev"), 1000))
    assert emails[-1] == "u1000@t.dev"


def test_independent():
    a = unique_emails("a", "t.dev")
    next(a)
    b = unique_emails("b", "t.dev")
    assert next(b) == "b1@t.dev"
    assert next(a) == "a2@t.dev"
