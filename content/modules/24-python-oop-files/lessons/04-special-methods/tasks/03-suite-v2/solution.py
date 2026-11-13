class Tags:
    def __init__(self):
        self._tags = set()

    def add(self, tag: str) -> None:
        self._tags.add(tag.lower())

    def __len__(self):
        return len(self._tags)

    def __contains__(self, tag):
        return tag.lower() in self._tags

    def __iter__(self):
        return iter(sorted(self._tags))
