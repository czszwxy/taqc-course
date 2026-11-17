from sqlalchemy import select
from sqlalchemy.orm import selectinload

from models import Product


def catalog(session):
    stmt = select(Product).options(selectinload(Product.tags)).order_by(Product.sku)
    products = session.scalars(stmt).all()
    return [(product.sku, sorted(tag.name for tag in product.tags)) for product in products]
