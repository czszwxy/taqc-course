from solution import diff_json

EXPECTED = {"id": 7, "user": {"email": "qa@gadgetly.test", "role": "admin"}, "tags": ["new", "sale"]}
ACTUAL = {"id": "7", "user": {"email": "qa@gadgetly.test"}, "tags": ["new", "promo"], "debug": True}


def test_example():
    assert diff_json(EXPECTED, ACTUAL) == [
        "$.id: expected 7, got '7'",
        "$.user.role: missing",
        "$.tags[1]: expected 'sale', got 'promo'",
        "$.debug: unexpected",
    ]


def test_equal_documents():
    assert diff_json(EXPECTED, {"id": 7, "user": {"email": "qa@gadgetly.test", "role": "admin"}, "tags": ["new", "sale"]}) == []


def test_type_matters():
    """1 == True і 1 == 1.0 у Python, але для API це різні значення: порівнюй і тип."""
    assert diff_json({"ok": 1, "price": 499}, {"ok": True, "price": 499.0}) == [
        "$.ok: expected 1, got True",
        "$.price: expected 499, got 499.0",
    ]


def test_list_length():
    """Різна довжина — спершу повідомлення про довжину, потім порівняння спільних позицій."""
    assert diff_json({"items": [1, 2, 3]}, {"items": [1, 5]}) == [
        "$.items: expected 3 items, got 2",
        "$.items[1]: expected 2, got 5",
    ]


def test_nested_list_of_dicts():
    """Шлях нарощується на кожному рівні: $.orders[0].status."""
    expected = {"orders": [{"id": 1, "status": "paid"}]}
    actual = {"orders": [{"id": 1, "status": "created"}]}
    assert diff_json(expected, actual) == ["$.orders[0].status: expected 'paid', got 'created'"]


def test_dict_instead_of_list():
    """Словник замість списку — різні типи: один рядок для всього значення."""
    assert diff_json({"tags": []}, {"tags": {}}) == ["$.tags: expected [], got {}"]


def test_none_value():
    assert diff_json({"city": "Lviv"}, {"city": None}) == ["$.city: expected 'Lviv', got None"]


def test_top_level_values():
    assert diff_json(200, 404) == ["$: expected 200, got 404"]
