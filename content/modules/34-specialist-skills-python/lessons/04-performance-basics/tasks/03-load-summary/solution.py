import math

FIRST_ERROR_STATUS = 400
P95 = 95
PERCENT = 100


def percentile(values, p):
    """Nearest-rank percentile: the value that p % of the values are not above."""
    if not values:
        return 0
    ordered = sorted(values)
    rank = math.ceil(p * len(ordered) / PERCENT)
    return ordered[max(rank, 1) - 1]


def summarize(samples, sla):
    requests = len(samples)
    if requests == 0:
        return {"requests": 0, "error_rate": 0, "avg_ms": 0, "p95_ms": 0, "passed": False}

    durations = [sample["duration_ms"] for sample in samples]
    errors = [sample for sample in samples if sample["status"] >= FIRST_ERROR_STATUS]
    error_rate = len(errors) / requests
    p95_ms = percentile(durations, P95)

    return {
        "requests": requests,
        "error_rate": error_rate,
        "avg_ms": round(sum(durations) / requests),
        "p95_ms": p95_ms,
        "passed": p95_ms <= sla["p95_ms"] and error_rate <= sla["max_error_rate"],
    }
