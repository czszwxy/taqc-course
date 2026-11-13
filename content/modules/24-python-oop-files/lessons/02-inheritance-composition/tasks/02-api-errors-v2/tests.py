import pytest

from solution import FormatError, RequiredFieldError, ValidationError, validate_email


def test_hierarchy():
    assert issubclass(ValidationError, Exception)
    assert issubclass(RequiredFieldError, ValidationError)
    assert issubclass(FormatError, ValidationError)


def test_valid_email_is_cleaned():
    assert validate_email(" qa@example.test ") == "qa@example.test"


def test_required():
    """Порожнє або з пробілів — RequiredFieldError з полем і повідомленням."""
    with pytest.raises(RequiredFieldError) as exc:
        validate_email("   ")
    assert exc.value.field == "email"
    assert str(exc.value) == "email: is required"


def test_format():
    with pytest.raises(FormatError, match="email: must contain @"):
        validate_email("qa.example.test")


def test_base_class_catches_all():
    """except ValidationError ловить обидва підкласи."""
    with pytest.raises(ValidationError):
        validate_email("")
