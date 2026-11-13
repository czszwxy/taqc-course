"""A fake HTTP session for tests: answers from a dict and remembers every request."""


class FakeSession:
    def __init__(self, responses):
        self.responses = responses  # url -> (status, body)
        self.requests = []

    def get(self, url):
        self.requests.append(url)
        return self.responses.get(url, (404, {"error": "not found"}))
