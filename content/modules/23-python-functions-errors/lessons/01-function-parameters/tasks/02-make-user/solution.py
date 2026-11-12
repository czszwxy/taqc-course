def make_user(**overrides):
    user = {"email": "user@example.test", "password": "Secret123", "role": "customer", "active": True}
    user.update(overrides)
    return user
