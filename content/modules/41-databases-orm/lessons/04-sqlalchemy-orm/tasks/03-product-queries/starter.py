from sqlalchemy import select

from models import Product


def add_product(session, sku, name, price, category):
    # твій код тут
    pass


def find_by_sku(session, sku):
    # твій код тут
    pass


def cheapest_in_category(session, category, limit=3):
    # твій код тут
    pass


def mark_sold_out(session, sku):
    # твій код тут
    pass
