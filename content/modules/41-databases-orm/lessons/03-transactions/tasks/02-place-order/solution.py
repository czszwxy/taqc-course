from errors import OutOfStock


def place_order(conn, user_id, items):
    with conn:
        for product_id, quantity in items:
            cursor = conn.execute(
                "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
                (quantity, product_id, quantity),
            )
            if cursor.rowcount == 0:
                raise OutOfStock(product_id)
        order_id = conn.execute("INSERT INTO orders (user_id) VALUES (?)", (user_id,)).lastrowid
        conn.executemany(
            "INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)",
            [(order_id, product_id, quantity) for product_id, quantity in items],
        )
    return order_id
