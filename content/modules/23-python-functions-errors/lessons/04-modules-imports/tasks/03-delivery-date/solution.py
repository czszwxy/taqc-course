from datetime import date, timedelta


def delivery_date(order_date: str, days: int) -> str:
    return (date.fromisoformat(order_date) + timedelta(days=days)).isoformat()
