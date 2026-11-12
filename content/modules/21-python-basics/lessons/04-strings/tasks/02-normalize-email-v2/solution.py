def normalize_phone(phone: str) -> str:
    return phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
