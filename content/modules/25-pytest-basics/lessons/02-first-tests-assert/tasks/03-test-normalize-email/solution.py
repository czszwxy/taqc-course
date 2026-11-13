from subject import normalize_email


def test_already_normalized_email_is_unchanged():
    assert normalize_email("qa@example.test") == "qa@example.test"


def test_uppercase_is_lowered():
    assert normalize_email("QA@Example.TEST") == "qa@example.test"


def test_leading_spaces_are_removed():
    assert normalize_email("  qa@example.test") == "qa@example.test"


def test_trailing_spaces_are_removed():
    assert normalize_email("qa@example.test  ") == "qa@example.test"
