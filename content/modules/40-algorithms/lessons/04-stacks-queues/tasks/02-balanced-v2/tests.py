from solution import valid_nesting


def test_valid_list():
    tags = ["<ul>", "<li>", "</li>", "<li>", "<br/>", "</li>", "</ul>"]
    assert valid_nesting(tags) is True


def test_crossed_tags():
    """Закриватися має останній відкритий тег."""
    assert valid_nesting(["<b>", "<i>", "</b>", "</i>"]) is False


def test_unclosed_tag():
    assert valid_nesting(["<div>"]) is False


def test_closing_without_opening():
    assert valid_nesting(["</p>"]) is False


def test_self_closing_only():
    """<br/> нічого не відкриває — перевір endswith(\"/>\") першим."""
    assert valid_nesting(["<br/>", "<img/>"]) is True


def test_empty():
    assert valid_nesting([]) is True


def test_different_names():
    assert valid_nesting(["<p>", "</div>"]) is False
