class TemporaryOverride:
    def __init__(self, settings, **overrides):
        self.settings = settings
        self.overrides = overrides
        self.old = {}
        self.added = []

    def __enter__(self):
        self.old = {key: self.settings[key] for key in self.overrides if key in self.settings}
        self.added = [key for key in self.overrides if key not in self.settings]
        self.settings.update(self.overrides)
        return self.settings

    def __exit__(self, exc_type, exc, tb):
        self.settings.update(self.old)
        for key in self.added:
            self.settings.pop(key, None)
        return False
