def pass_rate(results: list[str]) -> float:
    passed = 0
    for result in results:
        if result == "Passed":
            passed =+ 1
    return round(passed / len(result) * 100, 1)
