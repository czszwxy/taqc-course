from solution import first_unique_char, flatten, is_anagram, second_largest


def test_first_unique_char():
    assert first_unique_char("swiss") == "w"


def test_first_unique_char_first_one_wins():
    """Кілька унікальних — повертай перший за порядком у рядку."""
    assert first_unique_char("checkout") == "h"


def test_first_unique_char_case_matters():
    """Регістр важливий: "A" і "a" — різні символи."""
    assert first_unique_char("Aa") == "A"


def test_first_unique_char_none():
    """Немає унікальних або рядок порожній — None."""
    assert first_unique_char("aabb") is None
    assert first_unique_char("") is None


def test_is_anagram_true():
    assert is_anagram("Listen", "Silent") is True


def test_is_anagram_ignores_spaces():
    """Пробіли не враховуються: прибери їх перед порівнянням."""
    assert is_anagram("Dormitory", "dirty room") is True


def test_is_anagram_counts_letters():
    """Однаковий набір літер, але різна кількість — не анаграма."""
    assert is_anagram("aab", "abb") is False
    assert is_anagram("abc", "abd") is False


def test_second_largest():
    assert second_largest([5, 1, 5, 3]) == 3


def test_second_largest_needs_two_unique():
    """[7, 7] — одне унікальне число, тож другого найбільшого немає. sorted(numbers)[-2] тут помиляється."""
    assert second_largest([7, 7]) is None
    assert second_largest([]) is None


def test_second_largest_negative():
    assert second_largest([-1, -5, -3]) == -3


def test_flatten_deep():
    assert flatten([1, [2, [3, [4]]], 5]) == [1, 2, 3, 4, 5]


def test_flatten_keeps_strings():
    """Рядок — не список: його не розбирають на літери."""
    assert flatten(["ab", ["cd"]]) == ["ab", "cd"]


def test_flatten_empty_lists():
    assert flatten([]) == []
    assert flatten([[[]], []]) == []
