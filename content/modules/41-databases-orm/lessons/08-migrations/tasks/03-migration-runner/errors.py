class MigrationError(Exception):
    def __init__(self, version):
        super().__init__(f"migration {version} failed")
        self.version = version
