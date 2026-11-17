def save_products(conn, products):
    with conn:
        cursor = conn.executemany("INSERT INTO products (sku, name, price) VALUES (:sku, :name, :price)", products)
    return cursor.rowcount
