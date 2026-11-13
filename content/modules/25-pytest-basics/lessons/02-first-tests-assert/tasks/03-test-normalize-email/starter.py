from subject import normalize_email


def test_already_normalized_email_is_unchanged():
    assert normalize_email("qa@example.test") == "qa@example.test"


# твій код тут
