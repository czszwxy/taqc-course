import pytest

from solution import WorkerConfig, WorkerConfigError, load_worker_config

QUEUE = "redis://queue:6379/0"


def problem_names(env):
    with pytest.raises(WorkerConfigError) as caught:
        load_worker_config(env)
    return [problem.split()[0] for problem in caught.value.problems]


def test_defaults():
    """Лише QUEUE_URL — решта за замовчуванням."""
    assert load_worker_config({"QUEUE_URL": QUEUE}) == WorkerConfig(QUEUE, 4, False, (1.0, 5.0, 30.0))


def test_everything_set():
    """Усі змінні задані, з пробілами по краях."""
    config = load_worker_config({"QUEUE_URL": f" {QUEUE} ", "CONCURRENCY": " 16 ", "DRY_RUN": "Yes", "RETRY_DELAYS": "0.5, 2,10"})
    assert config == WorkerConfig(QUEUE, 16, True, (0.5, 2.0, 10.0))


def test_queue_required():
    """Немає QUEUE_URL — помилка."""
    assert problem_names({}) == ["QUEUE_URL"]


@pytest.mark.parametrize("value", ["0", "65", "-2", "four"])
def test_bad_concurrency(value):
    """CONCURRENCY — від 1 до 64."""
    assert problem_names({"QUEUE_URL": QUEUE, "CONCURRENCY": value}) == ["CONCURRENCY"]


@pytest.mark.parametrize("value, expected", [("1", 1), ("64", 64), ("", 4)])
def test_concurrency_bounds(value, expected):
    """1 і 64 — коректні; порожній рядок — 4."""
    assert load_worker_config({"QUEUE_URL": QUEUE, "CONCURRENCY": value}).concurrency == expected


@pytest.mark.parametrize("value, expected", [("false", False), ("OFF", False), ("0", False), ("on", True), ("1", True)])
def test_dry_run_words(value, expected):
    """bool("false") — True, тому слова перевіряються за списком."""
    assert load_worker_config({"QUEUE_URL": QUEUE, "DRY_RUN": value}).dry_run is expected


def test_dry_run_unknown_word():
    """Невідоме слово — помилка."""
    assert problem_names({"QUEUE_URL": QUEUE, "DRY_RUN": "sometimes"}) == ["DRY_RUN"]


def test_single_delay():
    """Одна затримка — кортеж з одного числа."""
    assert load_worker_config({"QUEUE_URL": QUEUE, "RETRY_DELAYS": "3"}).retry_delays == (3.0,)


@pytest.mark.parametrize("value", ["1,,2", "0", "-1", "soon", "1,2,", "nan", "inf"])
def test_bad_delays(value):
    """Кожна затримка — скінченне число більше за 0; порожня частина — теж помилка."""
    assert problem_names({"QUEUE_URL": QUEUE, "RETRY_DELAYS": value}) == ["RETRY_DELAYS"]


def test_all_problems_in_order():
    """Усі помилки разом, у порядку таблиці."""
    names = problem_names({"CONCURRENCY": "100", "DRY_RUN": "maybe", "RETRY_DELAYS": "x"})
    assert names == ["QUEUE_URL", "CONCURRENCY", "DRY_RUN", "RETRY_DELAYS"]
