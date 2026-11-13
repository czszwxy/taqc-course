from subject import is_valid_password


def test_typical_password():
    assert is_valid_password("Secret123") is True


def test_eight_chars_is_valid():
    assert is_valid_password("a" * 8) is True


def test_seven_chars_is_too_short():
    assert is_valid_password("a" * 7) is False


def test_sixty_four_chars_is_valid():
    assert is_valid_password("a" * 64) is True


def test_sixty_five_chars_is_too_long():
    assert is_valid_password("a" * 65) is False
