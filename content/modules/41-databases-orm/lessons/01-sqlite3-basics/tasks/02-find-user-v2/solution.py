def products_in_category(conn, category, max_price=None):
    rows = conn.execute(
        "SELECT sku, price FROM products"
        " WHERE category = :category AND (:max_price IS NULL OR price <= :max_price)"
        " ORDER BY price, sku",
        {"category": category, "max_price": max_price},
    ).fetchall()
    return [{"sku": sku, "price": price} for sku, price in rows]
