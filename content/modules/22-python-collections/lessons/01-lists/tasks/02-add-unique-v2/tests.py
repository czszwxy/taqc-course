from solution import remove_value


def test_removes_all_occurrences():
    """Прибери всі входження, а не лише перше."""
    assert remove_value(["smoke", "flaky", "login", "flaky"], "flaky") == ["smoke", "login"]


def test_adjacent_duplicates():
    """Два однакові елементи поруч — обидва мають зникнути."""
    assert remove_value(["flaky", "flaky", "smoke"], "flaky") == ["smoke"]


def test_input_unchanged():
    """Не змінюй вхідний список — збирай новий."""
    tags = ["smoke", "flaky"]
    remove_value(tags, "flaky")
    assert tags == ["smoke", "flaky"]


def test_value_missing():
    assert remove_value(["smoke"], "flaky") == ["smoke"]
