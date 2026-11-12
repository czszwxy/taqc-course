def failed_lines(lines):
    for line in lines:
        if "FAILED" in line:
            yield line.strip()
