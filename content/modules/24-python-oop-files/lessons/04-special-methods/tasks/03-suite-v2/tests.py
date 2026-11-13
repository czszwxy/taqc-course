from solution import Tags


def make_tags():
    tags = Tags()
    tags.add("Smoke")
    tags.add("login")
    tags.add("SMOKE")
    return tags


def test_len_ignores_case_duplicates():
    """Додавай теги в нижньому регістрі — Smoke і SMOKE стануть одним."""
    assert len(make_tags()) == 2


def test_contains_ignores_case():
    """__contains__ теж нормалізує: tag.lower()."""
    tags = make_tags()
    assert "smoke" in tags
    assert "LOGIN" in tags
    assert "cart" not in tags


def test_iterates_sorted():
    """Перебір за алфавітом: iter(sorted(...))."""
    assert list(make_tags()) == ["login", "smoke"]


def test_empty_is_falsy():
    assert not Tags()
