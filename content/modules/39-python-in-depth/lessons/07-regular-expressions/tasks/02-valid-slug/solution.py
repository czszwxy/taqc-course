import re

SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
MIN_LENGTH = 3
MAX_LENGTH = 50


def is_valid_slug(text):
    return MIN_LENGTH <= len(text) <= MAX_LENGTH and SLUG.fullmatch(text) is not None
