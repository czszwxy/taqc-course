def polls_until_paid(statuses: list[str], max_polls: int) -> int:
    poll = 0
    while poll < max_polls and poll < len(statuses):
        poll += 1
        if statuses[poll - 1] == "paid":
            return poll
    return -1
