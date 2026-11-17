from typing import get_type_hints

import pytest

from solution import OrderItem, OrderPayload, parse_order


def test_order_item_shape():
    """OrderItem: sku: str, quantity: int."""
    assert get_type_hints(OrderItem) == {"sku": str, "quantity": int}


def test_required_and_optional_keys():
    """note — NotRequired[str]; id та items — обов'язкові."""
    assert OrderPayload.__required_keys__ == frozenset({"id", "items"})
    assert OrderPayload.__optional_keys__ == frozenset({"note"})
    assert get_type_hints(OrderPayload)["items"] == list[OrderItem]


def test_valid_payload_keeps_only_known_keys():
    """Повертай новий словник лише з відомими ключами (без coupon і color)."""
    data = {"id": 1002, "items": [{"sku": "KB-01", "quantity": 2, "color": "black"}], "coupon": "X"}
    assert parse_order(data) == {"id": 1002, "items": [{"sku": "KB-01", "quantity": 2}]}


def test_note_is_kept_when_present():
    data = {"id": 1, "items": [{"sku": "A", "quantity": 1}], "note": "leave at the door"}
    assert parse_order(data)["note"] == "leave at the door"


@pytest.mark.parametrize("order_id", [None, "1002", 10.5, True])
def test_id_must_be_an_integer(order_id):
    """type(order_id) is int — bool теж відкидається."""
    data = {"items": [{"sku": "A", "quantity": 1}]}
    if order_id is not None:
        data["id"] = order_id
    with pytest.raises(ValueError, match="id must be an integer"):
        parse_order(data)


@pytest.mark.parametrize("items", [None, [], "KB-01", {"sku": "A"}])
def test_items_must_be_a_non_empty_list(items):
    data = {"id": 1}
    if items is not None:
        data["items"] = items
    with pytest.raises(ValueError, match="items must be a non-empty list"):
        parse_order(data)


def test_item_errors_name_the_position():
    """Номер позиції — з enumerate: item 1 — друга позиція."""
    data = {"id": 1, "items": [{"sku": "A", "quantity": 1}, {"sku": 7, "quantity": 1}]}
    with pytest.raises(ValueError, match="item 1: sku must be a string"):
        parse_order(data)


@pytest.mark.parametrize("quantity", [0, -1, "2", 1.5, True])
def test_quantity_must_be_a_positive_integer(quantity):
    data = {"id": 1, "items": [{"sku": "A", "quantity": quantity}]}
    with pytest.raises(ValueError, match="item 0: quantity must be a positive integer"):
        parse_order(data)


def test_item_that_is_not_a_dict():
    with pytest.raises(ValueError, match="item 0: sku must be a string"):
        parse_order({"id": 1, "items": ["KB-01"]})


def test_note_must_be_a_string():
    with pytest.raises(ValueError, match="note must be a string"):
        parse_order({"id": 1, "items": [{"sku": "A", "quantity": 1}], "note": 5})
