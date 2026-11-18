import pytest

from solution import lint_dockerfile

GOOD = """# shop API
FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["fastapi", "run", "shop_api/main.py", "--port", "8000"]
"""


def test_clean_file():
    """Правильний Dockerfile — жодної проблеми, []."""
    assert lint_dockerfile(GOOD) == []


def test_example_from_statement():
    """Приклад з умови: чотири проблеми, кожна на своєму рядку."""
    text = "FROM python\nCOPY . .\nRUN pip install -r requirements.txt\nCMD fastapi run main.py\n"
    assert lint_dockerfile(text) == [(1, "base-tag"), (2, "copy-before-install"), (3, "pip-cache"), (4, "shell-form")]


@pytest.mark.parametrize("line", ["FROM python", "FROM python:latest", "FROM --platform=linux/amd64 python", "from python:latest AS build"])
def test_base_without_tag(line):
    """Без тегу або latest — base-tag (прапорці й AS name не заважають)."""
    assert lint_dockerfile(line + "\n") == [(1, "base-tag")]


@pytest.mark.parametrize("line", [
    "FROM python:3.13-slim",
    "FROM python@sha256:0123456789abcdef",
    "FROM scratch",
    "FROM --platform=linux/amd64 python:3.13-slim AS build",
    "FROM registry.example.com:5000/shop/base:2.1",
])
def test_pinned_base(line):
    """Тег, digest, scratch — усе гаразд."""
    assert lint_dockerfile(line + "\n") == []


def test_registry_port_is_not_a_tag():
    """У registry.example.com:5000/shop/base двокрапка — порт реєстру, тегу немає."""
    assert lint_dockerfile("FROM registry.example.com:5000/shop/base\n") == [(1, "base-tag")]


def test_previous_stage_is_not_an_image():
    """FROM build — це попередній етап, не образ з реєстру."""
    text = "FROM python:3.13-slim AS build\nRUN echo build\nFROM build\n"
    assert lint_dockerfile(text) == []


def test_lowercase_instructions_and_line_numbers_skip_comments():
    """Інструкції в будь-якому регістрі; номер рядка рахує й коментарі та порожні рядки."""
    text = "# base\n\nfrom python:3.13-slim\n\n# deps\nrun pip install fastapi\n"
    assert lint_dockerfile(text) == [(6, "pip-cache")]


def test_continued_instruction_reports_first_line():
    """Рядки з \\ у кінці — одна інструкція; номер — її першого рядка."""
    text = "FROM python:3.13-slim\nRUN pip install \\\n    --no-cache-dir \\\n    -r requirements.txt\nRUN pip install \\\n    fastapi\n"
    assert lint_dockerfile(text) == [(5, "pip-cache")]


def test_copy_everything_before_install():
    """COPY ./ або COPY . /app перед pip install — кеш залежностей пропадає після кожної зміни коду."""
    text = "FROM python:3.13-slim\nCOPY ./ /app\nCOPY --chown=app . /app\nRUN pip install --no-cache-dir -r /app/requirements.txt\n"
    assert lint_dockerfile(text) == [(2, "copy-before-install"), (3, "copy-before-install")]


def test_copy_of_requirements_or_from_stage_is_fine():
    """COPY requirements.txt і COPY --from=… — не вся папка проєкту."""
    text = "FROM python:3.13-slim\nCOPY requirements.txt .\nCOPY --from=build . /app\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\n"
    assert lint_dockerfile(text) == []


def test_copy_without_any_pip_install():
    """У файлі немає pip install — правилу copy-before-install нема з чим порівнювати."""
    assert lint_dockerfile("FROM python:3.13-slim\nCOPY . .\n") == []


def test_apt_update_alone():
    """apt-get update окремо від install — застарілий кеш списку пакетів."""
    text = "FROM python:3.13-slim\nRUN apt-get update\nRUN apt-get install -y libpq5\nRUN apt-get update && apt-get install -y --no-install-recommends curl\n"
    assert lint_dockerfile(text) == [(2, "apt-update-alone")]


@pytest.mark.parametrize("line", ["CMD fastapi run main.py", "ENTRYPOINT python -m shop_api", "cmd  python app.py"])
def test_shell_form(line):
    """CMD / ENTRYPOINT без [ … ] — shell-форма, застосунок не отримає SIGTERM."""
    assert lint_dockerfile("FROM python:3.13-slim\n" + line + "\n") == [(2, "shell-form")]


def test_several_problems_on_one_line_sorted():
    """Кілька проблем — відсортовано за рядком, на одному рядку — за кодом."""
    text = "FROM python:3.13-slim\nRUN apt-get update && pip install fastapi\nFROM python\n"
    assert lint_dockerfile(text) == [(2, "apt-update-alone"), (2, "pip-cache"), (3, "base-tag")]
