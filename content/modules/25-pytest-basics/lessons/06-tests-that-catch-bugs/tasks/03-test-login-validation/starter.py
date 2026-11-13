from subject import login_error


def test_valid_form_has_no_error():
    assert login_error("qa@example.test", "secret123") == ""


# твій код тут
