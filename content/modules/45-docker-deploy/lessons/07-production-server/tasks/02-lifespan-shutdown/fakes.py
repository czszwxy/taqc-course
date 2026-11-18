class FakeDatabase:
    """Records what happened, in order, in self.journal."""

    def __init__(self):
        self.connected = False
        self.saved = []
        self.journal = []

    async def connect(self):
        self.connected = True
        self.journal.append("connect")

    async def save_events(self, events):
        if not self.connected:
            raise RuntimeError("database is closed")
        self.saved.extend(events)
        self.journal.append(f"save {len(events)}")

    async def close(self):
        self.connected = False
        self.journal.append("close")
