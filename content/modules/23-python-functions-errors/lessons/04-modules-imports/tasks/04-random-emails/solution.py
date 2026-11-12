import random
import string


def random_emails(count: int, seed: int) -> list[str]:
    rng = random.Random(seed)
    emails = []
    for _ in range(count):
        name = "".join(rng.choice(string.ascii_lowercase) for _ in range(6))
        emails.append(f"user_{name}@test.dev")
    return emails
