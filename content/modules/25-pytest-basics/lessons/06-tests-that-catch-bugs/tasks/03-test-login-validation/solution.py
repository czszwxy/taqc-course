from subject import login_error

VALID_EMAIL = "qa@example.test"
VALID_PASSWORD = "secret123"


def test_valid_form_has_no_error():
    assert login_error(VALID_EMAIL, VALID_PASSWORD) == ""


def test_empty_email_is_required():
    assert login_error("", VALID_PASSWORD) == "Email is required"


def test_spaces_only_email_is_required():
    assert login_error("   ", VALID_PASSWORD) == "Email is required"


def test_email_without_at_is_invalid():
    assert login_error("qa.example.test", VALID_PASSWORD) == "Invalid email"


def test_empty_password_is_required():
    assert login_error(VALID_EMAIL, "") == "Password is required"


def test_seven_char_password_is_too_short():
    assert login_error(VALID_EMAIL, "1234567") == "Password must be at least 8 characters"


def test_eight_char_password_is_enough():
    assert login_error(VALID_EMAIL, "12345678") == ""


def test_email_error_comes_first():
    assert login_error("", "") == "Email is required"
