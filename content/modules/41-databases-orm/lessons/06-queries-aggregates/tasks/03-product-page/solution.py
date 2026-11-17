import math

from sqlalchemy import func, select

from models import Product


def product_page(session, page, per_page=5, search=None):
    if page < 1:
        raise ValueError("page starts at 1")
    conditions = [Product.name.ilike(f"%{search}%")] if search else []
    page_stmt = (
        select(Product.sku)
        .where(*conditions)
        .order_by(Product.id)
        .limit(per_page)
        .offset((page - 1) * per_page)
    )
    total = session.scalar(select(func.count()).select_from(Product).where(*conditions))
    return {
        "items": list(session.scalars(page_stmt).all()),
        "total": total,
        "pages": math.ceil(total / per_page),
    }
