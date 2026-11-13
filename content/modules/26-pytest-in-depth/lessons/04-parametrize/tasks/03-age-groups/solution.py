import pytest

from subject import age_group


@pytest.mark.parametrize("age, expected", [
    pytest.param(30, "adult", id="typical-adult"),
    pytest.param(0, "child", id="newborn"),
    pytest.param(12, "child", id="last-child-year"),
    pytest.param(13, "teen", id="first-teen-year"),
    pytest.param(17, "teen", id="last-teen-year"),
    pytest.param(18, "adult", id="first-adult-year"),
    pytest.param(64, "adult", id="last-adult-year"),
    pytest.param(65, "senior", id="first-senior-year"),
])
def test_age_group(age, expected):
    assert age_group(age) == expected


def test_negative_age_is_rejected():
    with pytest.raises(ValueError):
        age_group(-1)
