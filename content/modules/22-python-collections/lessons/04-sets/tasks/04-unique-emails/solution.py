def count_unique_emails(emails: list[str]) -> int:
    unique = set()
    for email in emails:
        unique.add(email.strip().lower())
    return len(unique)
