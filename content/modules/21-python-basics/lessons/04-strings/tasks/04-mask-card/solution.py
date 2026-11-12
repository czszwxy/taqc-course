def mask_card(number: str) -> str:
    digits = number.replace(" ", "")
    return "**** **** **** " + digits[-4:]
