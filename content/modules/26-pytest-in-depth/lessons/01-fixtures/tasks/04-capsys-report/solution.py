from subject import print_summary


def test_report_mentions_total(capsys):
    print_summary(["passed", "failed"])
    assert "Total" in capsys.readouterr().out


def test_report_with_failures(capsys):
    print_summary(["passed", "failed", "passed", "passed"])
    assert capsys.readouterr().out == "Total: 4\nPassed: 3\nFailed: 1\n"


def test_no_failed_line_when_all_passed(capsys):
    print_summary(["passed", "passed"])
    assert capsys.readouterr().out == "Total: 2\nPassed: 2\n"


def test_skipped_is_not_passed(capsys):
    print_summary(["passed", "skipped"])
    assert capsys.readouterr().out == "Total: 2\nPassed: 1\n"
