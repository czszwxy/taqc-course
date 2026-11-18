from solution import Autocomplete


def make():
    ac = Autocomplete()
    ac.add("Phone case", 5)
    ac.add("phone", 9)
    ac.add("Phone charger", 5)
    ac.add("laptop", 7)
    ac.add("laptop stand", 2)
    return ac


def test_example():
    """Спершу вага (9), потім рівні ваги (5) за алфавітом."""
    assert make().suggest("PH") == ["phone", "phone case", "phone charger"]


def test_limit():
    assert make().suggest("phone c", limit=1) == ["phone case"]
    assert make().suggest("p", limit=2) == ["phone", "phone case"]


def test_prefix_is_a_whole_query():
    """Префікс, що сам є запитом, теж потрапляє в підказки."""
    assert make().suggest("laptop") == ["laptop", "laptop stand"]


def test_unknown_prefix():
    assert make().suggest("tablet") == []


def test_prefix_normalized():
    """Регістр і пробіли по краях префікса не важливі."""
    assert make().suggest("  LAP ") == ["laptop", "laptop stand"]


def test_weights_add_up():
    """Повторне додавання збільшує вагу, а не перезаписує її."""
    ac = make()
    ac.add("laptop stand", 6)
    assert ac.suggest("lap") == ["laptop stand", "laptop"]


def test_default_weight_is_one():
    ac = Autocomplete()
    ac.add("case")
    ac.add("cable")
    ac.add("cable")
    assert ac.suggest("ca") == ["cable", "case"]


def test_only_whole_queries_are_suggested():
    """Вузли «по дорозі» (p, ph, pho…) — не запити: підказуй лише вузли, де запит закінчується."""
    ac = Autocomplete()
    ac.add("phone")
    assert ac.suggest("p") == ["phone"]


def test_empty_prefix_or_bad_limit():
    ac = make()
    assert ac.suggest("") == []
    assert ac.suggest("   ") == []
    assert ac.suggest("ph", limit=0) == []


def test_empty_query_rejected():
    ac = Autocomplete()
    for query in ["", "   "]:
        try:
            ac.add(query)
        except ValueError:
            continue
        raise AssertionError(f"add({query!r}) did not raise ValueError")


def test_cyrillic():
    """Trie працює з будь-якими літерами."""
    ac = Autocomplete()
    ac.add("Навушники", 3)
    ac.add("ноутбук", 4)
    assert ac.suggest("Н") == ["ноутбук", "навушники"]
