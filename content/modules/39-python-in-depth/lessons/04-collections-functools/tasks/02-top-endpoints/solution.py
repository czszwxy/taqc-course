from collections import Counter


def path_of(line):
    return line.split()[1].split("?")[0]


def top_endpoints(lines, n):
    counts = Counter(path_of(line) for line in lines if line.strip())
    return counts.most_common(n)
