def make_email_factory(domain):
    count = 0

    def next_email():
        nonlocal count
        count += 1
        return f"user{count}@{domain}"

    return next_email
