from subject import Stats, rollout_decision

BASELINE = Stats(requests=5000, errors=10, p95_ms=200)


def test_healthy_canary_is_promoted():
    canary = Stats(requests=1000, errors=0, p95_ms=190)
    assert rollout_decision(canary, BASELINE) == "promote"


# твій код тут
