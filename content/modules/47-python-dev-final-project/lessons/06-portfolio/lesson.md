# Репозиторій, Docker, CI і розповідь

Код проєкту готовий і перевірений. Тепер з нього треба зробити **репозиторій**, який рекрутер відкриє за 30 секунд, а розробник з команди запустить за 5 хвилин. Задачі в застосунку — це шматки. У репозиторії вони стають одним пакетом з тестами, конфігурацією, Docker, CI і README.

> [!IMPORTANT]
> Репозиторій створюєш **поза** папкою застосунку, наприклад `D:\projects\gadgetly-repairs`. Розв'язки кроків — твій код. Еталони, які відкриваються після задач, — теж частина курсу, але в портфоліо має бути код, який ти розумієш і можеш пояснити рядок за рядком.

> [!NOTE]
> Приклади — з репозиторію бібліотеки `library-loans`. Файли Gadgetly Repairs ти напишеш у задачах.

## Структура

```text
library-loans/
├── app/
│   ├── __init__.py
│   ├── rules.py          ← домен
│   ├── models.py
│   ├── repository.py
│   ├── services.py
│   ├── worker.py         ← процес доставки нагадувань
│   ├── settings.py       ← DATABASE_URL з оточення
│   └── main.py           ← FastAPI
├── tests/
│   ├── conftest.py       ← engine, session, client
│   ├── test_rules.py
│   ├── test_repository.py
│   └── test_api.py
├── migrations/           ← Alembic
├── pyproject.toml
├── requirements.txt      ← закріплені версії для образу
├── Dockerfile
├── compose.yaml
├── .github/workflows/ci.yml
├── .gitignore            ← .venv/, __pycache__/, *.db, .env
└── README.md
```

У задачах файли лежали поруч і імпортувалися як `from repairs import ...`. У пакеті імпорт стає `from app.repairs import ...` (або відносним: `from .repairs import ...`). Тести імпортують `from app.main import app`. Щоб це працювало без магії з `PYTHONPATH`, проєкт встановлюють у віртуальне оточення: `pip install -e ".[dev]"`.

## pyproject.toml

```toml
[project]
name = "library-loans"
version = "0.1.0"
requires-python = ">=3.13"
dependencies = ["fastapi[standard]", "sqlalchemy>=2.0", "alembic"]

[project.optional-dependencies]
dev = ["pytest", "ruff"]

[tool.pytest.ini_options]
testpaths = ["tests"]
```

Фікстури, які потрібні кільком файлам тестів (рушій бази, сесія, клієнт з підміненими залежностями), переїжджають у `tests/conftest.py`: pytest знаходить їх сам, без імпорту.

## Налаштування й таблиці

Адреса бази — з оточення, з розумним значенням для локального запуску:

```python
import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///library.db")
```

Таблиці створює **міграція** (Alembic, модуль «Databases & SQLAlchemy»), а не `create_all` під час кожного старту. Для першої версії портфоліо прийнятно й `create_all` у lifespan, але тоді напиши в README, що міграцій ще немає. Рев'юер оцінить, що ти знаєш про різницю.

## Worker як окремий процес

```python
# app/worker.py
def main():
    while True:
        with Session(engine) as session:
            send_reminders(session, send_email)
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
```

Запуск: `python -m app.worker`. У `compose.yaml` це другий сервіс з **тим самим образом**, що й API, але з іншою командою.

## Docker і compose

Все з модуля «Docker & Deployment» працює й тут:

- Dockerfile: `python:3.13-slim`, спершу залежності (кеш шарів), потім код, користувач не root, `CMD` у **exec-формі** (`["fastapi", "run", ...]`), щоб `SIGTERM` дійшов до сервера. `pyproject.toml` описує залежності «від» (`sqlalchemy>=2.0`), а для образу потрібні точні версії. Тому поруч кладуть закріплений `requirements.txt`, згенерований з робочого venv: `pip freeze --exclude-editable > requirements.txt`. Його й копіюють першим.
- compose: `db` (Postgres з volume і healthcheck), `api` (порт назовні, `depends_on` з `condition: service_healthy`), `worker` (той самий `build`, інша `command`, без портів).
- Паролі — не в `compose.yaml`: `${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD in .env}` і `.env` у `.gitignore`.
- Для Postgres у залежностях потрібен драйвер `psycopg[binary]`, а в `DATABASE_URL` — схема `postgresql+psycopg://`.

> [!TIP]
> Docker не обов'язковий, щоб проєкт був сильним. Якщо Docker у тебе не встановлено, залиш Dockerfile і compose з поясненням у README «перевірено в CI» — і додай у CI крок `docker build`.

## CI

Мінімальний workflow на кожен push і pull request: `actions/checkout@v7` → `actions/setup-python@v7` з `python-version: "3.13"` → `pip install -e ".[dev]"` → `ruff check .` → `pytest`. Тести на SQLite в пам'яті не потребують жодного сервісу. Зелений значок CI в README — перше, що бачить рекрутер.

## README

README пишеться для двох читачів: того, хто має 30 секунд (що це і чим цікаве), і того, хто має 5 хвилин (як запустити). Обов'язкові розділи:

| Розділ | Що там |
|---|---|
| перший абзац | що робить сервіс, одним-двома реченнями |
| запуск | команди, які можна скопіювати дослівно: venv, install, міграції, `fastapi dev`, worker |
| тести | `pytest` і що покрито |
| API | таблиця ендпоінтів, приклад запиту й відповіді, коди помилок |
| рішення | чому так: шари, оптимістичне блокування, outbox |
| припущення й обмеження | з огляду вимог (уроку 1) |
| що далі | конкретні наступні кроки |

## Історія комітів

Рев'юер дивиться не лише на код, а й на `git log`. Коміт на кожен крок (`Add domain rules with tests`, `Add ticket repository`…) розповідає, як проєкт ріс. Один коміт «initial» на 2 000 рядків — ні. Перед першим `push` перевір, що в історії немає `.env`, паролів і `*.db`: видалений пізніше файл лишається в історії назавжди.

## Розповідь про проєкт

На співбесіді питання «розкажи про свій проєкт» — найчастіше, і до нього можна підготуватися повністю:

1. **60 секунд**: що це, для кого, стек, що цікавого.
2. **Найцікавіше рішення** з причиною і компромісом: «оптимістичне блокування замість блокування рядків, бо…», «outbox, бо лист не може бути в одній транзакції з базою».
3. **Що було складно** і як розібрався(лася).
4. **Що зробив(ла) б далі** — JWT замість демо-токенів, backoff у worker, пагінація курсором.

> [!QA]
> Будь готовий(а) до уточнень: «а що, якщо worker упаде між send і commit?», «чому 404, а не 403?», «як перевірив(ла), що версія справді захищає від одночасних змін?». Відповіді — у твоїх тестах; назви їх.

## Підсумок

- Пакет `app/` + `tests/` з `conftest.py`; імпорти `from app...`; встановлення `pip install -e ".[dev]"`.
- `DATABASE_URL` з оточення, таблиці — міграцією; worker — окремий процес `python -m app.worker`.
- Dockerfile і compose: db + api + worker, паролі з `.env`, exec-форма `CMD`.
- CI: checkout → setup-python → install → ruff → pytest; зелений значок у README.
- README: що, як запустити, тести, API, рішення, припущення, що далі.
- Історія комітів по кроках і без секретів; розповідь про проєкт — рішення, компроміси, наступні кроки.
