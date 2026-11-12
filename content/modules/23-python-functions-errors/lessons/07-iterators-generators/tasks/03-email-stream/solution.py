def unique_emails(prefix: str, domain: str):
    number = 0
    while True:
        number += 1
        yield f"{prefix}{number}@{domain}"
