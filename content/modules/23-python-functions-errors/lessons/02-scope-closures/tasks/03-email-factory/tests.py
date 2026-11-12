from solution import make_email_factory


def test_sequence():
    """Кожен виклик — наступний номер: nonlocal count; count += 1."""
    new_email = make_email_factory("test.dev")
    assert new_email() == "user1@test.dev"
    assert new_email() == "user2@test.dev"
    assert new_email() == "user3@test.dev"


def test_factories_are_independent():
    """Кожна фабрика має свій лічильник — він живе в замиканні, а не глобально."""
    first = make_email_factory("test.dev")
    first()
    second = make_email_factory("qa.dev")
    assert second() == "user1@qa.dev"
    assert first() == "user2@test.dev"
