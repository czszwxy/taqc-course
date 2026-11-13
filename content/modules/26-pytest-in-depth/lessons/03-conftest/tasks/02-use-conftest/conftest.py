"""Shared fixtures for the access-control tests."""

import pytest

from subject import User


@pytest.fixture
def make_user():
    """Factory fixture: make_user(role="admin", active=False) builds a test user."""

    def build(**overrides):
        data = {"id": 1, "email": "qa@example.test", "role": "customer", "active": True}
        data.update(overrides)
        return User(**data)

    return build
