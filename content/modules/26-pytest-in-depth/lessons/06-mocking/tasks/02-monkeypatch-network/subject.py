BASE_URL = "https://api.example.test"


def fetch_json(url):
    """The real HTTP request. Network calls are disabled in tests — replace this function."""
    raise RuntimeError("real network calls are disabled in tests")


def order_status_text(order_id):
    try:
        data = fetch_json(f"{BASE_URL}/orders/{order_id}")
    except ConnectionError:
        return "Status is temporarily unavailable"
    if data is None:
        return f"Order #{order_id} not found"
    return f"Order #{order_id} is {data['status']}"
