from subject import http_status_class


def test_200_is_success():
    assert http_status_class(200) == "success"


# твій код тут
