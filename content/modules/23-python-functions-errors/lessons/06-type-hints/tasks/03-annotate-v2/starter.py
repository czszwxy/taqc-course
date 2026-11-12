def average(values):
    if not values:
        return None
    return sum(values) / len(values)


def find_user(users, email):
    for user in users:
        if user["email"] == email:
            return user
    return None


def tag_counts(tags):
    counts = {}
    for tag in tags:
        counts[tag] = counts.get(tag, 0) + 1
    return counts
