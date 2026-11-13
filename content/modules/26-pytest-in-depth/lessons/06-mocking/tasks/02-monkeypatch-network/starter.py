import subject


def test_found_order(monkeypatch):
    monkeypatch.setattr(subject, "fetch_json", lambda url: {"status": "paid"})
    assert "paid" in subject.order_status_text(1002)


# твій код тут
