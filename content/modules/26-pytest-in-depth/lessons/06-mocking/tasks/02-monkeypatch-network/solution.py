import subject


def test_found_order(monkeypatch):
    monkeypatch.setattr(subject, "fetch_json", lambda url: {"status": "paid"})
    assert subject.order_status_text(1002) == "Order #1002 is paid"


def test_requests_order_url(monkeypatch):
    requested = []

    def fake_fetch(url):
        requested.append(url)
        return {"status": "created"}

    monkeypatch.setattr(subject, "fetch_json", fake_fetch)
    subject.order_status_text(7)
    assert requested == ["https://api.example.test/orders/7"]


def test_missing_order(monkeypatch):
    monkeypatch.setattr(subject, "fetch_json", lambda url: None)
    assert subject.order_status_text(404) == "Order #404 not found"


def test_network_error(monkeypatch):
    def offline(url):
        raise ConnectionError("no route to host")

    monkeypatch.setattr(subject, "fetch_json", offline)
    assert subject.order_status_text(1) == "Status is temporarily unavailable"
