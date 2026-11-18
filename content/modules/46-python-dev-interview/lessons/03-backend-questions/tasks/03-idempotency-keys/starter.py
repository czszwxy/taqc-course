class IdempotencyConflict(Exception):
    pass


class IdempotencyStore:
    def __init__(self, ttl_seconds, clock):
        self._ttl = ttl_seconds
        self._clock = clock
        self._entries = {}

    def run(self, key, payload, action):
        # твій код тут
        pass
