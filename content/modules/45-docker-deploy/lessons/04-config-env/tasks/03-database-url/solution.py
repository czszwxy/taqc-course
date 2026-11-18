from urllib.parse import parse_qsl, unquote, urlsplit

POSTGRES_ENGINE = "django.db.backends.postgresql"
SQLITE_ENGINE = "django.db.backends.sqlite3"
POSTGRES_SCHEMES = ("postgresql", "postgres")
SQLITE_SCHEME = "sqlite"


def django_database(url):
    parts = urlsplit(url)
    scheme = parts.scheme.lower()
    if scheme == SQLITE_SCHEME:
        name = parts.path[1:]
        if not name:
            raise ValueError("sqlite URL needs a file path")
        return {"ENGINE": SQLITE_ENGINE, "NAME": name}
    if scheme not in POSTGRES_SCHEMES:
        raise ValueError(f"unsupported database URL scheme: {scheme!r}")
    name = unquote(parts.path[1:])
    if not name:
        raise ValueError("database name is missing")
    port = parts.port
    return {
        "ENGINE": POSTGRES_ENGINE,
        "NAME": name,
        "USER": unquote(parts.username or ""),
        "PASSWORD": unquote(parts.password or ""),
        "HOST": parts.hostname or "",
        "PORT": str(port) if port is not None else "",
        "OPTIONS": dict(parse_qsl(parts.query)),
    }
