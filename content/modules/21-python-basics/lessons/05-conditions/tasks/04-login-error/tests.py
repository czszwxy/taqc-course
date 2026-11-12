from solution import login_error


def test_valid():
    """Немає помилок — порожній рядок."""
    assert login_error("qa@example.test", "secret123") == ""


def test_email_required():
    assert login_error("", "secret123") == "Email is required"


def test_email_only_spaces():
    """Email лише з пробілів теж порожній: перевір not email.strip()."""
    assert login_error("   ", "secret123") == "Email is required"


def test_invalid_email():
    assert login_error("qa.example.test", "secret123") == "Invalid email"


def test_password_required():
    assert login_error("qa@example.test", "") == "Password is required"


def test_password_boundary():
    """7 символів — помилка, 8 — вже ні: len(password) < 8."""
    assert login_error("qa@example.test", "1234567") == "Password must be at least 8 characters"
    assert login_error("qa@example.test", "12345678") == ""


def test_first_error_wins():
    """Перевіряй email раніше за пароль — показуємо першу помилку."""
    assert login_error("", "") == "Email is required"
