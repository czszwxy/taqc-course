class EmailTaken(Exception):
    def __init__(self, email):
        super().__init__(f"email is already registered: {email}")
        self.email = email
