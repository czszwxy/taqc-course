from solution import percentile, summarize

TEN = [100, 100, 100, 100, 100, 100, 100, 100, 100, 2000]


def ok(duration_ms):
    return {"duration_ms": duration_ms, "status": 200}


SAMPLES = [ok(120), ok(480), {"duration_ms": 300, "status": 500}, ok(100)]


def test_median_of_an_odd_list():
    """Відсортуй копію за зростанням і візьми елемент з номером math.ceil(p * n / 100) — нумерація з 1."""
    assert percentile([300, 100, 200], 50) == 200


def test_p95_of_ten_values_is_the_largest_one():
    """Для 10 значень: 95 * 10 / 100 = 9.5 → вгору → 10, тобто десятий елемент. int(9.5) дає 9 — округлення вниз."""
    assert percentile(TEN, 95) == 2000


def test_p90_of_ten_values_is_the_ninth_one():
    """90 * 10 / 100 = 9.0 → дев'ятий елемент (індекс 8)."""
    assert percentile(TEN, 90) == 100


def test_lowest_and_highest_percentile():
    """p100 — найбільше значення, p1 з трьох — найменше: math.ceil(0.03) = 1 → перший елемент."""
    assert percentile([1000, 200, 30], 100) == 1000
    assert percentile([1000, 200, 30], 1) == 30


def test_does_not_change_the_input_list():
    """values.sort() сортує список на місці — той, який тобі передали. Візьми копію: sorted(values)."""
    values = [300, 100, 200]
    percentile(values, 50)
    assert values == [300, 100, 200]


def test_empty_list_gives_0():
    """Порожній список оброби на початку: return 0."""
    assert percentile([], 95) == 0


def test_counts_requests_errors_average_and_p95():
    assert summarize(SAMPLES, {"p95_ms": 500, "max_error_rate": 0.3}) == {
        "requests": 4,
        "error_rate": 0.25,
        "avg_ms": 250,
        "p95_ms": 480,
        "passed": True,
    }


def test_4xx_responses_are_errors_too():
    """Помилка — статус 400 і вище: sample["status"] >= 400."""
    samples = [ok(100), {"duration_ms": 100, "status": 404}]
    assert summarize(samples, {"p95_ms": 500, "max_error_rate": 1})["error_rate"] == 0.5


def test_rounds_the_average():
    """avg_ms = round(сума / кількість): 302 / 3 = 100.67 → 101."""
    assert summarize([ok(100), ok(101), ok(101)], {"p95_ms": 500, "max_error_rate": 0})["avg_ms"] == 101


def test_fails_when_p95_is_above_the_limit():
    """passed вимагає p95_ms <= sla["p95_ms"]."""
    assert summarize(SAMPLES, {"p95_ms": 400, "max_error_rate": 0.3})["passed"] is False


def test_fails_when_the_error_rate_is_above_the_limit_even_if_fast():
    """Обидві умови мають виконуватись: і p95, і error_rate."""
    assert summarize(SAMPLES, {"p95_ms": 500, "max_error_rate": 0.1})["passed"] is False


def test_passes_exactly_on_the_limits():
    """Межі включно: <=, а не <."""
    assert summarize(SAMPLES, {"p95_ms": 480, "max_error_rate": 0.25})["passed"] is True


def test_no_data_is_not_a_pass():
    """Порожній список: усі числа 0 і "passed": False — і жодного ділення на нуль."""
    assert summarize([], {"p95_ms": 500, "max_error_rate": 0.01}) == {
        "requests": 0,
        "error_rate": 0,
        "avg_ms": 0,
        "p95_ms": 0,
        "passed": False,
    }
