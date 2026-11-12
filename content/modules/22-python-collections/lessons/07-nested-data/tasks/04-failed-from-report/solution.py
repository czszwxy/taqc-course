import json


def failed_tests(report_json: str) -> list[str]:
    report = json.loads(report_json)
    failed = []
    for suite in report["suites"]:
        for test in suite["tests"]:
            if test["status"] == "failed":
                failed.append(f"{suite['name']} > {test['title']}")
    return failed
