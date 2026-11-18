from collections import OrderedDict


class LRUCache:
    def __init__(self, capacity):
        if capacity < 1:
            raise ValueError("capacity must be at least 1")
        self._capacity = capacity
        self._data = OrderedDict()

    def get(self, key):
        if key not in self._data:
            return None
        self._data.move_to_end(key)
        return self._data[key]

    def put(self, key, value):
        self._data[key] = value
        self._data.move_to_end(key)
        if len(self._data) > self._capacity:
            oldest, _ = self._data.popitem(last=False)
            return oldest
        return None

    def __len__(self):
        return len(self._data)

    def __contains__(self, key):
        return key in self._data
