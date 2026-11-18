from dataclasses import dataclass

MIN_REQUESTS = 200
MAX_ERROR_RATE = 0.02
MAX_SLOWDOWN = 1.25


@dataclass(frozen=True)
class Stats:
    requests: int
    errors: int
    p95_ms: float


def rollout_decision(canary, baseline, *, min_requests=MIN_REQUESTS, max_error_rate=MAX_ERROR_RATE, max_slowdown=MAX_SLOWDOWN):
    """"wait", "rollback" or "promote" for a canary release."""
    if canary.requests < min_requests:
        return "wait"
    if canary.errors / canary.requests > max_error_rate:
        return "rollback"
    return "promote"
