class Transaction:
    def __init__(self, store):
        self.store = store
        self.changes = {}
        self.status = "new"

    def __enter__(self):
        self.status = "open"
        return self.changes

    def __exit__(self, exc_type, exc, tb):
        if exc_type is None:
            self.store.update(self.changes)
            self.status = "committed"
        else:
            self.status = "rolled back"
        return False
