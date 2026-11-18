import pytest

from solution import django_database

PG = "django.db.backends.postgresql"


def test_full_postgres_url():
    """Приклад з умови."""
    assert django_database("postgresql://shop:s3cret@db:5432/shop?sslmode=require") == {
        "ENGINE": PG,
        "NAME": "shop",
        "USER": "shop",
        "PASSWORD": "s3cret",
        "HOST": "db",
        "PORT": "5432",
        "OPTIONS": {"sslmode": "require"},
    }


def test_postgres_alias_and_scheme_case():
    """postgres:// — те саме, що postgresql://; регістр схеми не важливий."""
    assert django_database("postgres://shop:pw@db/shop")["ENGINE"] == PG
    assert django_database("POSTGRESQL://shop:pw@db/shop")["ENGINE"] == PG


def test_missing_parts_are_empty_strings():
    """Немає користувача, пароля, порту — порожні рядки, OPTIONS — {}."""
    assert django_database("postgresql://db/shop") == {
        "ENGINE": PG,
        "NAME": "shop",
        "USER": "",
        "PASSWORD": "",
        "HOST": "db",
        "PORT": "",
        "OPTIONS": {},
    }


def test_port_is_a_string():
    """PORT — рядок, не число."""
    assert django_database("postgresql://shop:pw@db:6543/shop")["PORT"] == "6543"


def test_password_is_decoded():
    """Спецсимволи закодовані через %: p%40ss%2Fword — це p@ss/word."""
    result = django_database("postgresql://shop%2Bapi:p%40ss%2Fword@db:5432/shop")
    assert (result["USER"], result["PASSWORD"]) == ("shop+api", "p@ss/word")


def test_database_name_is_decoded():
    """Назва бази теж декодується."""
    assert django_database("postgresql://db/shop%20archive")["NAME"] == "shop archive"


def test_several_options():
    """Кілька параметрів після ?."""
    options = django_database("postgresql://db/shop?sslmode=verify-full&connect_timeout=5")["OPTIONS"]
    assert options == {"sslmode": "verify-full", "connect_timeout": "5"}


def test_missing_database_name():
    """Без назви бази — ValueError."""
    for url in ("postgresql://db:5432", "postgresql://db:5432/"):
        with pytest.raises(ValueError):
            django_database(url)


def test_bad_port():
    """Нечисловий порт — ValueError."""
    with pytest.raises(ValueError):
        django_database("postgresql://shop:pw@db:port/shop")


def test_sqlite_relative():
    """sqlite:///db.sqlite3 — відносний шлях, лише ENGINE і NAME."""
    assert django_database("sqlite:///db.sqlite3") == {"ENGINE": "django.db.backends.sqlite3", "NAME": "db.sqlite3"}


def test_sqlite_absolute():
    """sqlite:////data/shop.sqlite3 — абсолютний шлях: прибирається лише один /."""
    assert django_database("sqlite:////data/shop.sqlite3")["NAME"] == "/data/shop.sqlite3"


def test_sqlite_without_path():
    """sqlite:// без шляху — ValueError."""
    with pytest.raises(ValueError):
        django_database("sqlite://")


@pytest.mark.parametrize("url", ["mysql://shop:pw@db/shop", "shop", "", "http://db/shop"])
def test_unsupported(url):
    """Інші схеми й не-адреси — ValueError."""
    with pytest.raises(ValueError):
        django_database(url)
