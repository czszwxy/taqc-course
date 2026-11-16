import xml.etree.ElementTree as ET


def summarize_junit(xml_text: str) -> dict:
    summary = {"total": 0, "passed": 0, "failed": 0, "errors": 0, "skipped": 0, "failed_tests": []}
    root = ET.fromstring(xml_text)
    for case in root.iter("testcase"):
        summary["total"] += 1
        name = f"{case.get('classname')}::{case.get('name')}"
        if case.find("failure") is not None:
            summary["failed"] += 1
            summary["failed_tests"].append(name)
        elif case.find("error") is not None:
            summary["errors"] += 1
            summary["failed_tests"].append(name)
        elif case.find("skipped") is not None:
            summary["skipped"] += 1
        else:
            summary["passed"] += 1
    return summary
