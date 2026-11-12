def failed_checks(value, checks):
    return [name for name, check in checks.items() if not check(value)]
