import pytest

from subject import age_group


@pytest.mark.parametrize("age, expected", [
    (30, "adult"),
    # твій код тут
])
def test_age_group(age, expected):
    assert age_group(age) == expected
