import xml.etree.ElementTree as ET


def slowest_tests(xml_text: str, limit: int) -> list[tuple[str, float]]:
    root = ET.fromstring(xml_text)
    timings = []
    for case in root.iter("testcase"):
        name = f"{case.get('classname')}::{case.get('name')}"
        timings.append((name, float(case.get("time", "0"))))
    timings.sort(key=lambda item: (-item[1], item[0]))
    return timings[:limit]
