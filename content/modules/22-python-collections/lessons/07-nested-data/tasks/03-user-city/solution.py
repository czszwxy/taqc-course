def user_city(response: dict) -> str | None:
    data = response.get("data") or {}
    user = data.get("user") or {}
    address = user.get("address") or {}
    return address.get("city")
