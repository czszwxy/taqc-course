def make_range_check(low, high):
    def check(value):
        return low <= value <= high
    return check
