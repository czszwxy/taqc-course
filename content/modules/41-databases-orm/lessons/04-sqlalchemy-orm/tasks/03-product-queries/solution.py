from sqlalchemy import select

from models import Product


def add_product(session, sku, name, price, category):
    product = Product(sku=sku, name=name, price=price, category=category)
    session.add(product)
    session.commit()
    return product


def find_by_sku(session, sku):
    return session.scalars(select(Product).where(Product.sku == sku)).first()


def cheapest_in_category(session, category, limit=3):
    stmt = (
        select(Product)
        .where(Product.category == category, Product.in_stock.is_(True))
        .order_by(Product.price, Product.sku)
        .limit(limit)
    )
    return session.scalars(stmt).all()


def mark_sold_out(session, sku):
    product = find_by_sku(session, sku)
    if product is None:
        return False
    product.in_stock = False
    session.commit()
    return True
