from subject import print_summary


def test_report_mentions_total(capsys):
    print_summary(["passed", "failed"])
    assert "Total" in capsys.readouterr().out


# твій код тут
