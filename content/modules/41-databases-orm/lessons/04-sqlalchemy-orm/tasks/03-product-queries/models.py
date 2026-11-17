from sqlalchemy import String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    sku: Mapped[str] = mapped_column(String(20), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    price: Mapped[int]
    category: Mapped[str] = mapped_column(String(30))
    in_stock: Mapped[bool] = mapped_column(default=True)

    def __repr__(self):
        return f"Product({self.sku!r}, price={self.price})"
