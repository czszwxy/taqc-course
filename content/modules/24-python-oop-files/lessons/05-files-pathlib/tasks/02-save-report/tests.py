from pathlib import Path

from solution import save_report


def test_creates_file(tmp_path):
    """Файл <folder>/<name>.txt, кожен рядок закінчується \\n."""
    path = save_report(tmp_path, "smoke", ["login: passed", "cart: failed"])
    assert path == tmp_path / "smoke.txt"
    assert path.read_text(encoding="utf-8") == "login: passed\ncart: failed\n"


def test_returns_path(tmp_path):
    assert isinstance(save_report(tmp_path, "r", ["x"]), Path)


def test_creates_nested_folders(tmp_path):
    """Папок ще немає — mkdir(parents=True, exist_ok=True)."""
    folder = tmp_path / "reports" / "2026-11-13"
    path = save_report(folder, "smoke", ["ok"])
    assert path.exists()


def test_cyrillic(tmp_path):
    path = save_report(tmp_path, "uk", ["вхід: OK"])
    assert path.read_bytes().decode("utf-8") == "вхід: OK\n"


def test_overwrites(tmp_path):
    """Повторний запис замінює вміст."""
    save_report(tmp_path, "smoke", ["old"])
    path = save_report(tmp_path, "smoke", ["new"])
    assert path.read_text(encoding="utf-8") == "new\n"


def test_empty_report(tmp_path):
    assert save_report(tmp_path, "empty", []).read_text(encoding="utf-8") == ""
