class ValidationError(Exception):
    # твій код тут
    pass


class RequiredFieldError(ValidationError):
    pass


class FormatError(ValidationError):
    pass


def validate_email(value: str) -> str:
    # твій код тут
    pass
