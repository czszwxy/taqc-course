from sqlalchemy import select
from sqlalchemy.orm import selectinload

from models import Product


def catalog(session):
    products = session.scalars(select(Product).order_by(Product.sku)).all()
    return [(product.sku, sorted(tag.name for tag in product.tags)) for product in products]
