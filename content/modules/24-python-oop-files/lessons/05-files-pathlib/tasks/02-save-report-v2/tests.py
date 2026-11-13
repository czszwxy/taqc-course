from solution import append_log


def test_creates_file(tmp_path):
    log = tmp_path / "run.log"
    append_log(log, "start")
    assert log.read_text(encoding="utf-8") == "start\n"


def test_appends(tmp_path):
    """Режим "a" — попередні рядки залишаються."""
    log = tmp_path / "run.log"
    append_log(log, "start")
    append_log(log, "finish")
    assert log.read_text(encoding="utf-8") == "start\nfinish\n"


def test_keeps_existing_content(tmp_path):
    log = tmp_path / "run.log"
    log.write_text("old\n", encoding="utf-8")
    append_log(log, "кінець")
    assert log.read_text(encoding="utf-8") == "old\nкінець\n"
