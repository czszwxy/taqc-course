class RunReport:
    def __init__(self, name):
        self.name = name
        self.results = []

    def record(self, test, status):
        self.results.append((test, status))

    def count(self, status):
        return len([s for t, s in self.results if s == status])

    def failed(self):
        return [t for t, s in self.results if s == "failed"]

    def summary(self):
        total = len(self.results)
        return f"{self.name}: {total} tests, {self.count('passed')} passed, {self.count('failed')} failed"
