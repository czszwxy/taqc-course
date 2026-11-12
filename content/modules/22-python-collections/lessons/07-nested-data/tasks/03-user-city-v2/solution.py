def first_item_title(response: dict) -> str | None:
    data = response.get("data") or {}
    items = data.get("items") or []
    if not items:
        return None
    first = items[0] or {}
    return first.get("title")
