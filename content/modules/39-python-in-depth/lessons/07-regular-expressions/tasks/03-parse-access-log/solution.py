import re

PATTERN = re.compile(
    r'(?P<ip>\d{1,3}(?:\.\d{1,3}){3}) - \[(?P<time>[^\]]+)\] '
    r'"(?P<method>[A-Z]+) (?P<path>[^ ?"]+)(?:\?(?P<query>[^ "]*))? HTTP/[\d.]+" '
    r"(?P<status>\d{3}) (?P<ms>\d+)ms"
)


def parse_line(line):
    found = PATTERN.fullmatch(line.strip())
    if found is None:
        return None
    return {
        "ip": found["ip"],
        "method": found["method"],
        "path": found["path"],
        "query": found["query"] or "",
        "status": int(found["status"]),
        "ms": int(found["ms"]),
    }
