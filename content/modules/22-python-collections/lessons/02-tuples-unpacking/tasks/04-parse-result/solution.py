def parse_result(line: str) -> tuple[str, str, float]:
    name, status, duration = line.split(";")
    return name.strip(), status.strip(), float(duration)
