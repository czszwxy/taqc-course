from sqlalchemy import select

from models import Product, Tag


def add_tags(session, sku, names):
    product = session.scalars(select(Product).where(Product.sku == sku)).first()
    if product is None:
        raise LookupError(sku)
    for name in sorted({name.strip().lower() for name in names}):
        tag = session.scalars(select(Tag).where(Tag.name == name)).first()
        if tag is None:
            tag = Tag(name=name)
        if tag not in product.tags:
            product.tags.append(tag)
    session.commit()
    return sorted(tag.name for tag in product.tags)
