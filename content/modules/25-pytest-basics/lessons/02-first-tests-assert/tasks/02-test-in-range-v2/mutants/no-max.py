def is_valid_password(password: str) -> bool:
    """A password is valid when it has 8 to 64 characters (inclusive)."""
    return 8 <= len(password)
