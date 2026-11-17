import re

EMAIL = re.compile(r"([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})")
CARD = re.compile(r"\b(?:\d{4}[ -]?){3}(\d{4})\b")


def mask_secrets(text):
    text = EMAIL.sub(r"\1***@\2", text)
    return CARD.sub(lambda found: f"**** **** **** {found[1]}", text)
