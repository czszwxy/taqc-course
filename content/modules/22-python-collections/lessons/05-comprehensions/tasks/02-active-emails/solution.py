def active_emails(users: list[dict]) -> list[str]:
    return [u["email"].lower() for u in users if u["active"]]
