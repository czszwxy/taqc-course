import sqlite3

from errors import EmailTaken


def register_user(conn, email, name):
    email = email.strip().lower()
    try:
        with conn:
            cursor = conn.execute("INSERT INTO users (email, name) VALUES (?, ?)", (email, name))
    except sqlite3.IntegrityError as err:
        raise EmailTaken(email) from err
    return cursor.lastrowid
