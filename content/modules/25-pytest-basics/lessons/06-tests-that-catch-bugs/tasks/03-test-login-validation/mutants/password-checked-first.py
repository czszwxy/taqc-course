MIN_PASSWORD_LENGTH = 8


def login_error(email: str, password: str) -> str:
    if not password:
        return "Password is required"
    if len(password) < MIN_PASSWORD_LENGTH:
        return "Password must be at least 8 characters"
    if not email.strip():
        return "Email is required"
    if "@" not in email:
        return "Invalid email"
    return ""
