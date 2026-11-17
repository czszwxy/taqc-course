def common_items(customers, subscribers):
    buyers = set(customers)
    added = set()
    result = []
    for person in subscribers:
        if person in buyers and person not in added:
            result.append(person)
            added.add(person)
    return result
