# CI, README і публікація

Останній крок — зробити роботу **видимою**. Спершу ти збираєш регресійний набір для Returns & refunds (практика уроку): він має ловити кожну відому регресію. Потім переносиш свій підхід у **власний репозиторій** на Python, налаштовуєш CI, пишеш README і публікуєш проєкт. Посилання на нього ти поставиш у резюме, LinkedIn і супровідні листи.

## Регресійний набір

Регресійний набір — не «всі тести підряд», а **мінімальний набір, що ловить важливі регресії**. Для Returns & refunds:

| Ризик | Рівень | Тест |
|---|---|---|
| Межі вікна (14 / 15, 30 / 31) | API | параметризований `quote` для #5002–#5006 |
| Правила грошей | API | рядки таблиці рішень з утриманнями й бонусом |
| Валідація сервера | API | кількість понад куплену, подарункова картка |
| Доступ | API | відстеження з чужим email → 404 |
| Показ клієнту | UI | підтвердження = підсумок |

Більшість — API: швидко і стабільно. UI — лише там, де ризик у показі.

## Який застосунок тестувати в публічному репозиторії

Gadgetly Returns працює лише всередині курсу — GitHub Actions до нього не дістанеться. Для зеленого CI потрібен **публічний навчальний застосунок**: рекомендуємо **Toolshop** — practicesoftwaretesting.com (інтернет-магазин інструментів: каталог, пошук, кошик, оформлення, акаунт) і його REST API зі Swagger-документацією.

> [!WARNING]
> Це спільний публічний сервіс. Не запускай навантажувальні тести і великі цикли, тримай набір невеликим (15–30 тестів), не створюй тисячі записів і прибирай за собою. Публічний сайт може змінитися — тоді оновиш локатори, це теж частина роботи.

Документацію з Gadgetly Returns (тест-план, чекліст, таблиця рішень, тест-кейс, баг-репорти) поклади в `docs/gadgetly-returns/` як зразок своєї роботи.

## Мінімальний обсяг портфоліо-репозиторію

- `docs/`: тест-план, чекліст, 3–5 тест-кейсів, знайдені проблеми (якщо є);
- 10–20 UI-тестів через page objects і фікстури (`pages/`, `conftest.py`);
- 5–10 API-тестів з клієнтом, pydantic-моделями і параметризацією;
- `pyproject.toml` (testpaths, markers, `--strict-markers`, base_url), `requirements.txt` з версіями;
- CI на кожен push / PR і щоночі, з JUnit XML, HTML-звітом і трейсами упалих тестів;
- README з бейджем, інструкцією запуску і описом підходу.

## Конфігурація

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
addopts = "-ra --strict-markers"
markers = [
    "smoke: critical checks for every pull request",
    "api: tests without a browser",
    "ui: browser tests",
]
base_url = "https://practicesoftwaretesting.com"
```

## Workflow GitHub Actions

```yaml
name: Tests
on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: "0 4 * * *"
  workflow_dispatch:

jobs:
  tests:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-python@v7
        with:
          python-version: "3.13"
          cache: pip
      - run: pip install -r requirements.txt
      - run: python -m playwright install --with-deps chromium
      - name: Run tests
        run: >
          python -m pytest
          --junitxml=reports/junit.xml
          --html=reports/report.html --self-contained-html
          --tracing retain-on-failure
      - if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v7
        with:
          name: test-reports
          path: |
            reports/
            test-results/
```

## README

| Розділ | Що в ньому |
|---|---|
| Назва + бейдж CI | зелений бейдж — перше, що бачить рекрутер |
| Про проєкт | що тестується, стек, обсяг (скільки UI- і API-тестів) |
| Як запустити | venv → `pip install -r requirements.txt` → `playwright install` → `python -m pytest` |
| Структура | дерево з поясненням шарів |
| Підхід | що на API, що в UI, як дані й прибирання, як стабільність |
| Звіти | де знайти артефакти CI |
| Що далі | чесний план покращень |

## Перед публікацією

Склонуй репозиторій у **порожню** папку і пройди README буквально, як новий користувач. Перевір, що в історії git немає `.venv/`, звітів і жодних паролів чи токенів. Відкрий останній прогін CI і переконайся, що звіт відкривається з артефакту.

## Підсумок

- Регресія — мінімальний набір, що ловить важливі регресії; основа — API.
- Портфоліо — публічний навчальний застосунок (Toolshop): та сама архітектура, але CI може до нього дістатися.
- pyproject з маркерами й strict-опціями, зафіксовані залежності, CI зі звітами й трейсами.
- README: бейдж, запуск, структура, підхід, що далі.
- Перед публікацією — чистий клон, жодних секретів, зелений CI.
