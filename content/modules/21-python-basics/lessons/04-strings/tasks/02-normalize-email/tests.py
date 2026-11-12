from solution import normalize_email


def test_lowercase():
    """Переведи в нижній регістр: lower()."""
    assert normalize_email("QA@Gadgetly.Test") == "qa@gadgetly.test"


def test_strip():
    """Прибери пробіли по краях: strip()."""
    assert normalize_email("  qa@gadgetly.test  ") == "qa@gadgetly.test"


def test_both_and_newline():
    """strip() прибирає і перенос рядка \\n."""
    assert normalize_email(" QA@Site.COM\n") == "qa@site.com"


def test_already_normal():
    assert normalize_email("user@site.com") == "user@site.com"
