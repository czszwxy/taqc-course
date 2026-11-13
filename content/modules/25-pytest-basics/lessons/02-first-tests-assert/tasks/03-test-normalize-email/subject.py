def normalize_email(email: str) -> str:
    """Trim spaces around the email and lowercase it."""
    return email.strip().lower()
