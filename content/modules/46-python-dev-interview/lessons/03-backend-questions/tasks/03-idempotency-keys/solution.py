class IdempotencyConflict(Exception):
    pass


class IdempotencyStore:
    def __init__(self, ttl_seconds, clock):
        self._ttl = ttl_seconds
        self._clock = clock
        self._entries = {}

    def run(self, key, payload, action):
        if not key or not key.strip():
            raise ValueError("Idempotency-Key must not be empty")
        now = self._clock()
        entry = self._entries.get(key)
        if entry is not None and now - entry[2] >= self._ttl:
            del self._entries[key]
            entry = None
        if entry is not None:
            saved_payload, result, _ = entry
            if saved_payload != payload:
                raise IdempotencyConflict(f"key {key!r} was used with a different request")
            return result
        result = action()
        self._entries[key] = (dict(payload), result, now)
        return result
