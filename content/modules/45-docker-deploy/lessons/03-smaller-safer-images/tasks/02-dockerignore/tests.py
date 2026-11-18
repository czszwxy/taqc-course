import pytest

from solution import context_files, is_excluded

RULES = ".venv\n**/__pycache__\n*.md\n!README.md\n.env\n"


def test_example_from_statement():
    """Приклад з умови."""
    assert is_excluded(".venv/Lib/site.py", RULES) is True
    assert is_excluded("docs/guide.md", RULES) is False
    assert is_excluded("README.md", RULES) is False
    assert is_excluded("shop_api/main.py", RULES) is False


def test_nothing_matches():
    """Жоден рядок не спрацював — файл потрапляє в контекст."""
    assert is_excluded("requirements.txt", RULES) is False
    assert is_excluded("main.py", "") is False


def test_pattern_is_root_relative():
    """*.pyc без **/ — лише файли в корені проєкту."""
    assert is_excluded("main.pyc", "*.pyc") is True
    assert is_excluded("shop_api/main.pyc", "*.pyc") is False


def test_double_star_any_depth():
    """**/*.pyc — будь-де, і в корені теж (** — це й нуль папок)."""
    rules = "**/*.pyc"
    assert is_excluded("main.pyc", rules) is True
    assert is_excluded("shop_api/routes/orders.pyc", rules) is True
    assert is_excluded("shop_api/routes/orders.py", rules) is False


def test_double_star_in_the_middle():
    """shop_api/**/test_*.py — тести на будь-якій глибині всередині shop_api, але не поза ним."""
    rules = "shop_api/**/test_*.py"
    assert is_excluded("shop_api/test_main.py", rules) is True
    assert is_excluded("shop_api/routes/v2/test_orders.py", rules) is True
    assert is_excluded("tests/test_main.py", rules) is False


def test_star_does_not_cross_folders():
    """* працює в межах однієї частини шляху: shop_*/main.py не підходить до shop_api/v2/main.py."""
    assert is_excluded("shop_api/main.py", "shop_*/main.py") is True
    assert is_excluded("shop_api/v2/main.py", "shop_*/main.py") is False


def test_folder_excludes_everything_inside():
    """Шаблон, що збігся з папкою, виключає все в ній."""
    assert is_excluded(".venv/Lib/site-packages/fastapi/__init__.py", ".venv") is True
    assert is_excluded("shop_api/__pycache__/main.cpython-313.pyc", RULES) is True


def test_parent_must_match_from_root():
    """.env виключає .env і .env/…, але не config/.env і не .env.example."""
    assert is_excluded(".env", RULES) is True
    assert is_excluded("config/.env", RULES) is False
    assert is_excluded(".env.example", RULES) is False


def test_slashes_spaces_comments_and_dot_ignored():
    """/.venv/ = .venv; коментарі, порожні рядки й «.» не правила."""
    rules = "# local stuff\n\n  /.venv/  \n.\n"
    assert is_excluded(".venv/bin/python", rules) is True
    assert is_excluded("main.py", rules) is False


def test_question_mark_and_class():
    """? і [...] — як у fnmatch, в межах частини шляху."""
    assert is_excluded("temp1", "temp?") is True
    assert is_excluded("temp12", "temp?") is False
    assert is_excluded("log2.txt", "log[0-9].txt") is True


def test_exception_reincludes_file():
    """!-рядок повертає файл у контекст."""
    assert is_excluded("README.md", "*.md\n!README.md") is False
    assert is_excluded("CHANGELOG.md", "*.md\n!README.md") is True


def test_last_matching_line_wins():
    """Вирішує останній рядок, що спрацював: порядок важливий."""
    assert is_excluded("README-secret.md", "*.md\n!README*.md\nREADME-secret.md") is True
    assert is_excluded("README-secret.md", "*.md\nREADME-secret.md\n!README*.md") is False


def test_exception_inside_excluded_folder():
    """Виняток для файлу в виключеній папці теж працює: він останній, що спрацював."""
    rules = "config\n!config/defaults.toml"
    assert is_excluded("config/defaults.toml", rules) is False
    assert is_excluded("config/secrets.toml", rules) is True


def test_context_files_keeps_order():
    """context_files — лише файли, що потрапляють, у тому самому порядку."""
    paths = [
        "Dockerfile",
        ".env",
        "README.md",
        "notes.md",
        "requirements.txt",
        ".venv/pyvenv.cfg",
        "shop_api/main.py",
        "shop_api/__pycache__/main.cpython-313.pyc",
    ]
    assert context_files(paths, RULES) == ["Dockerfile", "README.md", "requirements.txt", "shop_api/main.py"]


def test_context_files_empty():
    """Порожній список — порожній результат."""
    assert context_files([], RULES) == []
