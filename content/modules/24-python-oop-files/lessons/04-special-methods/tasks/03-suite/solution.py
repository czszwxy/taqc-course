class Suite:
    def __init__(self, name: str):
        self.name = name
        self._tests = []

    def add(self, test: str) -> None:
        if test not in self._tests:
            self._tests.append(test)

    def __len__(self):
        return len(self._tests)

    def __contains__(self, test):
        return test in self._tests

    def __iter__(self):
        return iter(self._tests)

    def __repr__(self):
        return f"Suite({self.name!r}, {len(self)} tests)"
