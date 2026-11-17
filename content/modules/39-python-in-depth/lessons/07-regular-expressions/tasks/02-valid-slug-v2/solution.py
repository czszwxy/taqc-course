import re

ORDER_CODE = re.compile(r"ORD-20\d{2}-\d{6}")


def is_valid_order_code(text):
    return ORDER_CODE.fullmatch(text) is not None
