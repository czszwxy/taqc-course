from solution import read_cases

CSV_TEXT = 'email,password,should_pass\nqa@example.test,Secret123,yes\n,Secret123,no\nqa@example.test,"Se,cret",no\n'


def write_csv(tmp_path, text):
    path = tmp_path / "cases.csv"
    path.write_text(text, encoding="utf-8")
    return path


def test_reads_cases(tmp_path):
    assert read_cases(write_csv(tmp_path, CSV_TEXT)) == [
        ("qa@example.test", "Secret123", True),
        ("", "Secret123", False),
        ("qa@example.test", "Se,cret", False),
    ]


def test_quoted_comma(tmp_path):
    """Значення з комою в лапках — одне поле; модуль csv розбирає це правильно."""
    cases = read_cases(write_csv(tmp_path, CSV_TEXT))
    assert cases[2][1] == "Se,cret"


def test_should_pass_is_bool(tmp_path):
    """"yes" / "no" — рядки; перетвори на bool порівнянням == "yes"."""
    cases = read_cases(write_csv(tmp_path, CSV_TEXT))
    assert cases[0][2] is True and cases[1][2] is False


def test_header_only(tmp_path):
    assert read_cases(write_csv(tmp_path, "email,password,should_pass\n")) == []
