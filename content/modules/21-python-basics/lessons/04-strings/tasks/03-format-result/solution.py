def format_result(name: str, passed: int, total: int) -> str:
    percent = passed / total * 100
    return f"{name}: {passed}/{total} passed ({percent:.1f}%)"
