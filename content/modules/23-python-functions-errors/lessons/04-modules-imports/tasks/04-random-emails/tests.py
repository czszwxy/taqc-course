import random
import re

from solution import random_emails

EMAIL_FORMAT = re.compile(r"user_[a-z]{6}@test\.dev")


def test_count():
    assert len(random_emails(5, 1)) == 5


def test_format():
    """Формат: user_ + 6 малих літер + @test.dev."""
    for email in random_emails(5, 7):
        assert EMAIL_FORMAT.fullmatch(email), email


def test_same_seed_same_result():
    """Однаковий seed — однакові дані: random.Random(seed)."""
    assert random_emails(3, 42) == random_emails(3, 42)


def test_different_seed():
    assert random_emails(3, 1) != random_emails(3, 2)


def test_global_random_untouched():
    """Не змінюй спільний генератор: random.Random(seed) замість random.seed(seed)."""
    random.seed(2026)
    expected = random.random()
    random.seed(2026)
    random_emails(3, 42)
    assert random.random() == expected


def test_zero():
    assert random_emails(0, 42) == []
