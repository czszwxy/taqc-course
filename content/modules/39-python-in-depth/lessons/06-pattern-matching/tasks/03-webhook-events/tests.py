from solution import describe


def test_payment_succeeded():
    assert describe({"type": "payment.succeeded", "amount": 1299}) == "paid 1299 UAH"


def test_extra_keys_do_not_matter():
    """Словниковий патерн перевіряє лише названі ключі."""
    event = {"type": "payment.succeeded", "amount": 499, "currency": "UAH", "id": "evt_1"}
    assert describe(event) == "paid 499 UAH"


def test_amount_as_text_is_not_a_payment():
    """int(amount) у патерні перевіряє тип: рядок \"1299\" не підходить."""
    assert describe({"type": "payment.succeeded", "amount": "1299"}) == "ignored: payment.succeeded"


def test_zero_amount_is_not_a_payment():
    """Умова if amount > 0 у case."""
    assert describe({"type": "payment.succeeded", "amount": 0}) == "ignored: payment.succeeded"


def test_payment_failed():
    assert describe({"type": "payment.failed", "reason": "card declined"}) == "payment failed: card declined"


def test_refund():
    event = {"type": "refund.created", "amount": 300, "order_id": 5003}
    assert describe(event) == "refund 300 UAH for order 5003"


def test_refund_without_order_is_ignored():
    """Немає order_id — патерн refund не підходить."""
    assert describe({"type": "refund.created", "amount": 300}) == "ignored: refund.created"


def test_unknown_type():
    assert describe({"type": "customer.updated"}) == "ignored: customer.updated"


def test_invalid_events():
    """Немає type, type не рядок або подія взагалі не словник — 'invalid event'."""
    assert describe({"amount": 1}) == "invalid event"
    assert describe({"type": 42}) == "invalid event"
    assert describe(["payment.succeeded"]) == "invalid event"
    assert describe(None) == "invalid event"
