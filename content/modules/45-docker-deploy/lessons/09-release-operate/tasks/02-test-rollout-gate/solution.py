import pytest

from subject import Stats, rollout_decision

BASELINE = Stats(requests=5000, errors=10, p95_ms=200)


def test_healthy_canary_is_promoted():
    canary = Stats(requests=1000, errors=0, p95_ms=190)
    assert rollout_decision(canary, BASELINE) == "promote"


@pytest.mark.parametrize("requests, expected", [(199, "wait"), (200, "promote")])
def test_min_requests_boundary(requests, expected):
    assert rollout_decision(Stats(requests, 0, 190), BASELINE) == expected


def test_small_sample_waits_even_with_errors():
    assert rollout_decision(Stats(10, 10, 190), BASELINE) == "wait"


@pytest.mark.parametrize("errors, expected", [(4, "promote"), (5, "rollback")])
def test_error_rate_boundary(errors, expected):
    assert rollout_decision(Stats(200, errors, 190), BASELINE) == expected


def test_one_error_in_a_thousand_is_fine():
    assert rollout_decision(Stats(1000, 1, 190), BASELINE) == "promote"


@pytest.mark.parametrize("p95, expected", [(250, "promote"), (251, "rollback"), (400, "rollback")])
def test_latency_boundary(p95, expected):
    assert rollout_decision(Stats(1000, 0, p95), BASELINE) == expected


def test_no_baseline_latency_skips_the_check():
    no_data = Stats(requests=0, errors=0, p95_ms=0)
    assert rollout_decision(Stats(1000, 0, 900), no_data) == "promote"
