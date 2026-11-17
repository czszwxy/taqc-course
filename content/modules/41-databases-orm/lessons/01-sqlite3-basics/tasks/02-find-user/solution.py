def find_user(conn, email):
    row = conn.execute("SELECT id, email, name FROM users WHERE email = ?", (email,)).fetchone()
    if row is None:
        return None
    return {"id": row[0], "email": row[1], "name": row[2]}
