import pytest

from solution import longest_unique


@pytest.mark.parametrize(
    "text, expected",
    [("abcabcbb", 3), ("bbbbb", 1), ("pwwkew", 3), ("", 0), ("a", 1), ("abcdef", 6)],
)
def test_classic_cases(text, expected):
    assert longest_unique(text) == expected


def test_left_border_never_moves_back():
    """\"abba\": друга a бачить позицію 0, але вікно вже з 2 — перевіряй last_seen[char] >= start."""
    assert longest_unique("abba") == 2


def test_repeat_inside_the_window():
    """\"dvdf\" → 'vdf' = 3: після другої d вікно починається з v, а не з нуля."""
    assert longest_unique("dvdf") == 3


def test_spaces_and_case_count_as_characters():
    assert longest_unique("Aa a") == 3


def test_long_input():
    assert longest_unique("abc" * 20000 + "xyzw") == 7
