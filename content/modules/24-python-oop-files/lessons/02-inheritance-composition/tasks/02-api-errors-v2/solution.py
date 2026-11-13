class ValidationError(Exception):
    def __init__(self, field: str, message: str):
        super().__init__(f"{field}: {message}")
        self.field = field


class RequiredFieldError(ValidationError):
    pass


class FormatError(ValidationError):
    pass


def validate_email(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise RequiredFieldError("email", "is required")
    if "@" not in cleaned:
        raise FormatError("email", "must contain @")
    return cleaned
