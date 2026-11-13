import pytest

from subject import User, UserRepository


@pytest.fixture
def users():
    return [
        User(1, "qa@example.test"),
        User(2, "boss@example.test", "admin"),
        User(3, "old@example.test", active=False),
        User(4, "dev@example.test"),
    ]


@pytest.fixture
def repo(users):
    return UserRepository(users)


def test_empty_repository_has_no_users():
    assert len(UserRepository([])) == 0


def test_find_ignores_case_and_spaces(repo):
    assert repo.find(" BOSS@Example.test ") == User(2, "boss@example.test", "admin")


def test_active_excludes_inactive(repo):
    assert [user.id for user in repo.active()] == [1, 2, 4]


def test_count_by_role(repo):
    assert repo.count_by_role() == {"customer": 3, "admin": 1}


def test_repository_keeps_its_own_copy(users, repo):
    users.append(User(9, "late@example.test"))
    assert len(repo) == 4
