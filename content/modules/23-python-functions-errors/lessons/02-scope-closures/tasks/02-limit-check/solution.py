def make_limit_check(limit):
    def check(value):
        return value <= limit
    return check
