"""Старий синхронний генератор звітів (лише для читання): змінювати його не можна."""

import time


def build_report(day: str) -> dict:
    time.sleep(0.3)
    return {"day": day, "orders": 42, "revenue": 128_500}
