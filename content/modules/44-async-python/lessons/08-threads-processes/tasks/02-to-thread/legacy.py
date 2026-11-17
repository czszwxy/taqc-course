"""Старий синхронний кеш (лише для читання): блокувальні виклики; рахує одночасні виклики з різних потоків."""

import threading
import time


class LegacyCache:
    def __init__(self, delay=0.05):
        self.delay = delay
        self.calls = []
        self.in_flight = 0
        self.peak = 0
        self._lock = threading.Lock()

    def load(self, sku):
        with self._lock:
            self.calls.append(sku)
            self.in_flight += 1
            self.peak = max(self.peak, self.in_flight)
        try:
            time.sleep(self.delay)
            return f"value-of-{sku}"
        finally:
            with self._lock:
                self.in_flight -= 1
