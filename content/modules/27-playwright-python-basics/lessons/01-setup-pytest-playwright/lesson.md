# Встановлення pytest-playwright

У модулях про pytest ти тестував(ла) функції Python. Тепер ті самі тести з `assert`, фікстурами й маркерами керуватимуть **справжнім браузером**: відкриватимуть сторінку, натискатимуть кнопки й перевірятимуть те, що бачить користувач. Для цього є бібліотека **Playwright** від Microsoft і плагін **pytest-playwright**.

> [!QA]
> Автоматизований UI-тест — це тест-кейс, який виконує машина: ті самі кроки й той самий очікуваний результат, але за секунди і без утоми. Тестувальник, який автоматизував регресію, звільняє собі час на дослідницьке тестування — там, де людина корисніша за скрипт.

## З чого це складається

| Частина | Що це | Звідки береться |
|---|---|---|
| `playwright` | бібліотека Python, що керує браузером (Chromium, Firefox, WebKit) | `pip install` |
| браузери | спеціальні збірки Chromium / Firefox / WebKit для Playwright | `playwright install` |
| `pytest-playwright` | плагін pytest: фікстури `page`, `context`, `browser` і опції `--headed`, `--browser`… | `pip install` |
| `pytest` | запускає тести, як і раніше | ставиться разом із плагіном |

Плагін тягне за собою і `playwright`, і `pytest`, тому встановлюють одну назву.

## Встановлення з нуля (Windows)

```bash
python -m venv .venv
.venv\Scripts\activate
pip install pytest-playwright
playwright install chromium
```

| Команда | Що відбувається |
|---|---|
| `python -m venv .venv` | створює віртуальне оточення в папці `.venv` (ти робив(ла) це в модулі про venv) |
| `.venv\Scripts\activate` | вмикає його: далі `pip`, `pytest` і `playwright` беруться з `.venv` (macOS / Linux: `source .venv/bin/activate`) |
| `pip install pytest-playwright` | ставить плагін, бібліотеку Playwright і pytest |
| `playwright install chromium` | завантажує браузер (~150 МБ) у кеш Playwright |

> [!WARNING]
> `pip install` ставить лише **бібліотеку**, без браузерів. Якщо забути `playwright install`, перший тест упаде з `Executable doesn't exist at …` і підказкою запустити `playwright install`. Без аргументу команда завантажить усі три браузери — для початку вистачить `chromium`.

Версії фіксують у `requirements.txt`, щоб у колег і на CI було те саме:

```text
pytest-playwright==0.10.0
playwright==1.65.0
```

## Перший запуск

```text
gadgetly-ui-tests/
├── .venv/
├── requirements.txt
├── pytest.ini
└── tests/
    └── test_search.py
```

```python
# tests/test_search.py
from playwright.sync_api import Page, expect


def test_search_field_is_shown(page: Page):
    page.goto("http://localhost:5173/playground/search")
    expect(page.get_by_label("Search")).to_be_visible()
```

```bash
pytest
```

pytest знаходить тест (файл `test_*.py`, функція `test_*`), бачить параметр `page`, сам запускає браузер і передає тесту вкладку. За замовчуванням браузер працює **headless** — без вікна. Так швидше, і саме так тести запускаються на CI.

## Корисні опції

| Опція | Що робить |
|---|---|
| `--headed` | показати вікно браузера |
| `--slowmo 500` | пауза 500 мс після кожної дії — устигнеш роздивитися |
| `--browser firefox` | інший браузер (спершу `playwright install firefox`); опцію можна повторити: `--browser chromium --browser webkit` запустить кожен тест двічі |
| `--browser-channel chrome` | встановлений на комп'ютері Google Chrome (або `msedge`) замість збірки Chromium |
| `--base-url URL` | адреса застосунку для відносних `page.goto("/...")` |
| `--device "iPhone 13"` | емуляція пристрою: розмір екрана, user agent, touch |
| `--output DIR` | куди класти скріншоти, відео й трейси (за замовчуванням `test-results`) |
| `--screenshot`, `--video`, `--tracing` | артефакти для налагодження — урок 7 |

Опції, які потрібні завжди, записують у `pytest.ini`, щоб не набирати їх щоразу:

```text
[pytest]
addopts = --base-url http://localhost:5173
```

Тепер у тесті досить `page.goto("/playground/search")`, а щоб прогнати ті самі тести на іншому стенді, адресу передають при запуску: `pytest --base-url https://staging.example.com`.

> [!TIP]
> Документація Playwright написана для кількох мов. На playwright.dev обери **Python** у перемикачі мов: назви там у snake_case (`get_by_role`, `to_have_text`) і без `await`.

## Синхронний API

У Playwright для Python два API: синхронний (`playwright.sync_api`) і асинхронний (`playwright.async_api`, з `async def` і `await`). pytest-playwright працює із **синхронним**: тести — звичайні функції, кожен рядок виконується по черзі. Якщо в інтернеті трапиться `await page.goto(...)` — це async-версія (або TypeScript); у наших тестах `await` не потрібен.

## Лабораторія my-university

У цьому проєкті все вже встановлено: оточення `lab/.venv` і браузер у `lab/.browsers` (якщо колись знадобиться перевстановити — один раз `npm run lab:python-setup` у терміналі поза застосунком).

- **Задачі курсу** перевіряються прямо в застосунку: **▶ Run** запускає твій файл у справжньому Chromium на правильній сторінці, **✓ Check** — ще й на версіях сторінки з навмисними багами. Добрі тести зелені на правильній сторінці й червоні на кожній зламаній.
- **Власна практика** — папка `lab/python/tests`. Запуск з папки проєкту (застосунок має бути запущений): `npm run lab:py`, `npm run lab:py -- --headed --slowmo 500`, `npm run lab:py -- -k remember`. Сторінки там — Bug Playground **з багами**, тож добрий тест може впасти: значить, він знайшов баг.

## Типові помилки

- Запуск `pytest` без активованого оточення → `No module named 'playwright'` або `pytest` не знайдено.
- Забули `playwright install` → `Executable doesn't exist at …`.
- Файл `login_test.py` або функція `check_login` → pytest їх не збирає (`no tests ran`).
- `page.goto("localhost:5173/login")` без `http://` → помилка про неправильну адресу. Або повна адреса з `http://`, або відносна з `--base-url`.
- `--headed` на CI-сервері без екрана: там тести завжди headless.

## Підсумок

- `pip install pytest-playwright` + `playwright install chromium` у venv — і можна писати UI-тести на pytest.
- Тест просить фікстуру `page`, плагін сам запускає браузер; за замовчуванням headless.
- `--headed`, `--slowmo`, `--browser`, `--base-url`, `--device` — основні опції; постійні записують в `addopts` у `pytest.ini`.
- Тести синхронні: без `async` і `await`.
- У курсі: задачі перевіряються кнопками Run / Check, власна практика — `lab/python/tests` і `npm run lab:py`.
