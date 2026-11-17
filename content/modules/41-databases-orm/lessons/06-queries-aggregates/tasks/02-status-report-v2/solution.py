from sqlalchemy import func, select

from models import OrderItem, Product


def top_products(session, limit=3):
    sold = func.sum(OrderItem.quantity)
    stmt = (
        select(Product.sku, sold)
        .join(OrderItem, OrderItem.product_id == Product.id)
        .group_by(Product.id)
        .order_by(sold.desc(), Product.sku)
        .limit(limit)
    )
    return [(sku, quantity) for sku, quantity in session.execute(stmt).all()]
