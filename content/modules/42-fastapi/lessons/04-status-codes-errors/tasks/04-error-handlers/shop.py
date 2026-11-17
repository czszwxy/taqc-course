"""Сервіс магазину (лише для читання): логіка без HTTP, помилки — доменні винятки."""

PRODUCTS = {
    1: {"id": 1, "name": "USB-C cable", "price": 299, "stock": 40},
    5: {"id": 5, "name": "27-inch monitor", "price": 8999, "stock": 5},
}
COUPONS = {"WELCOME10": {"percent": 10, "expired": False}, "SPRING5": {"percent": 5, "expired": True}}


class ShopError(Exception):
    code = "shop_error"


class ProductNotFound(ShopError):
    code = "product_not_found"


class OutOfStock(ShopError):
    code = "out_of_stock"


class CouponExpired(ShopError):
    code = "coupon_expired"


class UnknownCoupon(ShopError):
    code = "unknown_coupon"


def get_product(product_id: int) -> dict:
    if product_id not in PRODUCTS:
        raise ProductNotFound(f"Product {product_id} not found")
    return PRODUCTS[product_id]


def place_order(product_id: int, quantity: int, coupon: str | None = None) -> dict:
    product = get_product(product_id)
    if quantity > product["stock"]:
        raise OutOfStock(f"Only {product['stock']} x {product['name']} left")
    percent = 0
    if coupon is not None:
        if coupon not in COUPONS:
            raise UnknownCoupon(f"Coupon {coupon} does not exist")
        if COUPONS[coupon]["expired"]:
            raise CouponExpired(f"Coupon {coupon} has expired")
        percent = COUPONS[coupon]["percent"]
    total = product["price"] * quantity * (100 - percent) // 100
    return {"product_id": product_id, "quantity": quantity, "total": total}
