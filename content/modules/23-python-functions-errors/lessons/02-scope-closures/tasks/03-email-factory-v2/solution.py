def make_id_sequence(start):
    current = start

    def next_id():
        nonlocal current
        value = current
        current += 1
        return value

    return next_id
