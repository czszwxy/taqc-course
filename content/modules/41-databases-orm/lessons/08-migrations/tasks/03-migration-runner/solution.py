import sqlite3

from errors import MigrationError


def apply_migrations(conn, migrations):
    conn.execute("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)")
    conn.commit()
    done = {row[0] for row in conn.execute("SELECT version FROM schema_version")}
    applied = []
    for version, statements in sorted(migrations, key=lambda migration: migration[0]):
        if version in done:
            continue
        try:
            for statement in statements:
                conn.execute(statement)
            conn.execute("INSERT INTO schema_version (version) VALUES (?)", (version,))
            conn.commit()
        except sqlite3.Error as err:
            conn.rollback()
            raise MigrationError(version) from err
        applied.append(version)
    return applied
