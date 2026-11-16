# Структура проєкту і налаштування pytest

Поки тестів п'ять, їх можна тримати в одному файлі. Коли їх двісті, кожна зміна в продукті перетворюється на пошук: адреса staging змінилась — правимо сорок файлів; кнопку перейменували — шукаємо всі `get_by_role("button", name="Sign in")`. **Фреймворк** — це домовленість, де що лежить, щоб кожна зміна робилась **в одному місці**.

> [!QA]
> «Розкажи про свій фреймворк» — одне з найчастіших питань на співбесіді на Automation QA. Від тебе чекають не назви бібліотек, а шари: де тести, де page objects, де клієнти API, як передаються налаштування і як усе це запускається в CI.

## Шари фреймворку

| Шар | Папка | Що всередині | Чого там бути **не** повинно |
|---|---|---|---|
| Тести | `tests/` | що перевіряємо: кроки й `assert` / `expect` | локаторів, адрес API, паролів |
| Сторінки | `pages/` | page objects: локатори й дії зі сторінкою | перевірок результату тесту |
| API-клієнти | `api/` | методи `login()`, `create_order()`: адреси, заголовки | знань про конкретний тест |
| Моделі | `models/` | pydantic-моделі відповідей (контракт) | HTTP-запитів |
| Дані | `data/` | білдери й фабрики тестових даних, файли JSON / CSV | реальних персональних даних |
| Налаштування | `config/` | `settings.py`: адреса, таймаути, браузер — зі змінних оточення | секретів, вписаних у код |
| Клей | `conftest.py` | фікстури, що з'єднують шари для тестів | логіки перевірок |

Тест читається як сценарій: «відкрий сторінку входу, увійди як користувач, перевір привітання». Як саме знаходиться поле email — справа page object; куди йде запит — справа клієнта.

## Дерево проєкту

```text
gadgetly-tests/
├── api/
│   ├── __init__.py
│   └── orders_client.py
├── config/
│   ├── __init__.py
│   └── settings.py
├── data/
│   ├── __init__.py
│   └── builders.py
├── models/
│   ├── __init__.py
│   └── order.py
├── pages/
│   ├── __init__.py
│   ├── login_page.py
│   └── account_page.py
├── tests/
│   ├── api/
│   │   ├── conftest.py      ← фікстури лише для API-тестів
│   │   └── test_orders.py
│   └── ui/
│       ├── conftest.py      ← page objects, увійдена сторінка
│       └── test_login.py
├── conftest.py              ← налаштування, клієнт API, токен — для всіх
├── pyproject.toml           ← налаштування pytest
├── requirements.txt
└── README.md
```

## conftest.py на кількох рівнях

pytest збирає фікстури з усіх `conftest.py` **від кореня до папки тесту**. Тест з `tests/ui/` бачить фікстури кореневого `conftest.py` і `tests/ui/conftest.py`, але не бачить `tests/api/conftest.py`.

| Фікстура | Де | Чому |
|---|---|---|
| `settings` (scope session) | `conftest.py` у корені | потрібна і UI, і API |
| `api_client`, `user_token` | `conftest.py` у корені | API готує дані й для UI-тестів |
| `login_page`, `signed_in_page` | `tests/ui/conftest.py` | браузерні — лише для UI |
| `created_order` (yield + видалення) | `tests/api/conftest.py` | потрібна лише API-тестам |

Правило: фікстура живе на **найнижчому** рівні, звідки її бачать усі тести, яким вона потрібна.

## pyproject.toml для команди

```toml
[tool.pytest.ini_options]
minversion = "9.0"
testpaths = ["tests"]
pythonpath = ["."]
addopts = "-ra --strict-markers"
markers = [
    "smoke: fast critical checks for every pull request",
    "regression: the full suite, nightly",
    "api: tests without a browser",
]
xfail_strict = true
base_url = "http://localhost:5173"
```

## Розбір: що дає кожен рядок

| Рядок | Що робить | Що буде без нього |
|---|---|---|
| `minversion` | старіший pytest одразу каже, що його треба оновити | дивні помилки на машині колеги |
| `testpaths` | шукати тести лише в `tests/` | pytest лізе в `.venv` і чужі папки |
| `pythonpath = ["."]` | корінь проєкту в шляху імпорту | `ModuleNotFoundError: No module named 'pages'` |
| `-ra` | короткий підсумок усіх не зелених тестів з причинами | причини skip / xfail не видно |
| `--strict-markers` | незареєстрований маркер — помилка | опечатка `smok` тихо вибирає нуль тестів |
| `markers` | список маркерів з описом | `--strict-markers` зупинить прогін |
| `xfail_strict` | xfail-тест, що раптом пройшов, — червоний | виправлений баг ніхто не помітить |
| `base_url` | адреса за замовчуванням для `page.goto("/...")` | кожен тест пише повну адресу |

> [!NOTE]
> pytest 9 також розуміє таблицю `[tool.pytest]` з «рідними» типами TOML (наприклад, `addopts = ["-ra", "--strict-markers"]`), а `xfail_strict` там має й нову назву `strict_xfail`. `[tool.pytest.ini_options]` працює в усіх версіях — його найчастіше побачиш у проєктах.

## Розбір: як тест проходить крізь шари

| Крок | Шар | Що відбувається |
|---|---|---|
| 1 | `pyproject.toml` | pytest знаходить `tests/ui/test_login.py`, додає корінь у шлях імпорту |
| 2 | `conftest.py` | фікстура `settings` читає змінні оточення один раз на прогін |
| 3 | `tests/ui/conftest.py` | фікстура `login_page` створює `LoginPage(page)` |
| 4 | тест | `login_page.sign_in(user.email, user.password)` — дія через page object |
| 5 | тест | `expect(login_page.greeting).to_have_text(...)` — перевірка в тесті |

## Типові помилки

- Локатори прямо в тестах — зміна однієї кнопки ламає двадцять файлів.
- `assert` усередині page object — один метод і діє, і перевіряє, тож для негативного сценарію його не використаєш.
- Усі фікстури в одному кореневому `conftest.py` на 600 рядків.
- `from tests.ui.conftest import ...` — фікстури не імпортують, їх просто називають параметром.
- Запуск `pytest` з папки `tests/` замість кореня — інші шляхи імпорту й інша конфігурація.

## Підсумок

- Фреймворк = шари: тести, page objects, API-клієнти, моделі, дані, налаштування, conftest.py.
- Кожна зміна в продукті — правка в одному місці.
- conftest.py на кількох рівнях; фікстура — на найнижчому спільному рівні.
- `pyproject.toml`: `testpaths`, `pythonpath`, `addopts = "-ra --strict-markers"`, `markers`, `xfail_strict`, `base_url`.
- Помилки конфігурації мають впізнавані симптоми — вмій їх читати.
