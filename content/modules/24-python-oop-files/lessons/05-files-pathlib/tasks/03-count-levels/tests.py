from solution import count_levels

LOG = """2026-11-13 10:00:01 INFO Test run started
2026-11-13 10:00:05 ERROR Payment failed
2026-11-13 10:00:06 WARN Slow response: 2300 ms

2026-11-13 10:00:09 INFO Retry after ERROR
2026-11-13 10:00:12 ERROR Помилка оплати
"""


def write_log(tmp_path, text):
    path = tmp_path / "server.log"
    path.write_text(text, encoding="utf-8")
    return path


def test_counts(tmp_path):
    assert count_levels(write_log(tmp_path, LOG)) == {"ERROR": 2, "WARN": 1}


def test_word_in_message_is_not_a_level(tmp_path):
    """Рівень — третє слово рядка; ERROR у тексті повідомлення не рахується."""
    log = write_log(tmp_path, "2026-11-13 10:00:09 INFO Retry after ERROR\n")
    assert count_levels(log) == {"ERROR": 0, "WARN": 0}


def test_empty_lines_skipped(tmp_path):
    """Порожні рядки пропускай — перевір довжину parts перед parts[2]."""
    log = write_log(tmp_path, "\n\n2026-11-13 10:00:05 WARN Slow\n")
    assert count_levels(log) == {"ERROR": 0, "WARN": 1}


def test_empty_file(tmp_path):
    """Обидва ключі є завжди, навіть для порожнього лога."""
    assert count_levels(write_log(tmp_path, "")) == {"ERROR": 0, "WARN": 0}
