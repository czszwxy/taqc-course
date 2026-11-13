class RequestLog:
    def __init__(self):
        self.entries = []

    def log(self, method, url, status):
        self.entries.append((method.upper(), url, status))

    def count(self, method):
        return len([m for m, u, s in self.entries if m == method.upper()])

    def errors(self):
        return [f"{m} {u} -> {s}" for m, u, s in self.entries if s >= 400]
