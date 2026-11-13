MIN_LENGTH = 9
STRONG_LENGTH = 12


def password_strength(password: str) -> str:
    """weak: shorter than 8; strong: 12+ characters with a digit and an uppercase letter; otherwise medium."""
    if len(password) < MIN_LENGTH:
        return "weak"
    has_digit = any(ch.isdigit() for ch in password)
    has_upper = any(ch.isupper() for ch in password)
    if len(password) >= STRONG_LENGTH and has_digit and has_upper:
        return "strong"
    return "medium"
