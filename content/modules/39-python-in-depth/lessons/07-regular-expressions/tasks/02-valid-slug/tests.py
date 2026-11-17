import pytest

from solution import is_valid_slug


@pytest.mark.parametrize("slug", ["wireless-headphones-h1", "kb-01", "usb", "a-b", "x" * 50, "4k-monitor-27"])
def test_valid_slugs(slug):
    assert is_valid_slug(slug) is True


def test_uppercase_is_not_allowed():
    assert is_valid_slug("Wireless-Headphones") is False


def test_double_hyphen_is_not_allowed():
    """Між словами — рівно один дефіс: (?:-[a-z0-9]+)*."""
    assert is_valid_slug("usb--hub") is False


@pytest.mark.parametrize("slug", ["-usb-hub", "usb-hub-"])
def test_hyphen_at_the_edges_is_not_allowed(slug):
    assert is_valid_slug(slug) is False


@pytest.mark.parametrize("slug", ["usb hub", "usb_hub", "навушники", "usb.hub"])
def test_other_characters_are_not_allowed(slug):
    assert is_valid_slug(slug) is False


def test_trailing_newline_is_not_allowed():
    """re.match з $ пропустить \"kb-01\\n\" — $ дозволяє перенос у кінці. Використай fullmatch."""
    assert is_valid_slug("kb-01\n") is False


def test_length_boundaries():
    """Від 3 до 50 символів включно."""
    assert is_valid_slug("ab") is False
    assert is_valid_slug("x" * 51) is False


def test_empty_string():
    assert is_valid_slug("") is False
