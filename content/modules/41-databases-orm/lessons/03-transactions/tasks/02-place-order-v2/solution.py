from errors import NotEnoughPoints, UnknownCustomer


def transfer_points(conn, from_id, to_id, points):
    if points <= 0:
        raise ValueError("points must be positive")
    with conn:
        debit = conn.execute(
            "UPDATE customers SET points = points - ? WHERE id = ? AND points >= ?",
            (points, from_id, points),
        )
        if debit.rowcount == 0:
            raise NotEnoughPoints(from_id)
        credit = conn.execute("UPDATE customers SET points = points + ? WHERE id = ?", (points, to_id))
        if credit.rowcount == 0:
            raise UnknownCustomer(to_id)
        conn.execute("INSERT INTO transfers (from_id, to_id, points) VALUES (?, ?, ?)", (from_id, to_id, points))
