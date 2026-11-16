from collections import Counter


def first_unique_char(text: str) -> str | None:
    counts = Counter(text)
    for char in text:
        if counts[char] == 1:
            return char
    return None


def is_anagram(a: str, b: str) -> bool:
    def letters(text):
        return sorted(text.replace(" ", "").lower())

    return letters(a) == letters(b)


def second_largest(numbers: list[int]) -> int | None:
    unique = sorted(set(numbers))
    if len(unique) < 2:
        return None
    return unique[-2]


def flatten(nested: list) -> list:
    result = []
    for item in nested:
        if isinstance(item, list):
            result.extend(flatten(item))
        else:
            result.append(item)
    return result
