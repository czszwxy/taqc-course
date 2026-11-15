# Паралельний запуск і налаштування

300 UI-тестів по 2 секунди — це 10 хвилин послідовно. На 4 ядрах паралельно — близько 3. Але паралельність одразу показує всі приховані залежності між тестами. А налаштування (браузер, розмір вікна, стенд, timeouts) мають жити в одному місці, а не розкидані по тестах.

## pytest-xdist

```bash
pip install pytest-xdist
pytest -n 4          # 4 процеси-воркери
pytest -n auto       # стільки воркерів, скільки ядер
pytest -n 4 --dist loadfile   # тести одного файлу — в одному воркері
```

Кожен **воркер** — окремий процес Python зі своїм браузером. pytest роздає тести воркерам, і вони виконуються одночасно. У лабораторії курсу: `npm run lab:py -- -n 4`.

## Що ламається при паралельності

| Проблема | Приклад | Як виправити |
|---|---|---|
| спільні дані на сервері | два тести змінюють одне замовлення | кожен тест створює своє (унікальний email, назва з `uuid`) |
| залежність від порядку | тест B проходить лише після тесту A | кожен тест сам готує передумову (фікстура) |
| глобальні підрахунки | `assert len(orders) == 5` | перевіряй **свої** дані за id |
| спільні файли | усі пишуть `screenshot.png` | `tmp_path` або унікальні назви |
| один акаунт, що змінюється | тест змінює пароль, інший у цей момент входить | окремі акаунти для тестів, що змінюють налаштування |

> [!NOTE]
> Session-фікстура з xdist виконується **в кожному воркері**: при `-n 4` вхід через storage state відбудеться 4 рази. Це нормально — головне, що не 300.

## pytest.ini для UI-проєкту

```text
[pytest]
testpaths = tests
pythonpath = .
addopts = --base-url http://localhost:5173 --tracing retain-on-failure --screenshot only-on-failure
markers =
    smoke: critical checks for every pull request
    slow: long end-to-end flows
```

- `addopts` — опції, що додаються до кожного запуску; з командного рядка їх можна перебити (`--base-url https://staging…`).
- `markers` — зареєстровані маркери: `pytest -m smoke` запустить лише позначені тести, а опечатка в назві маркера дасть попередження.

## Налаштування контексту

Розмір вікна, мова, часовий пояс, кольорова схема — це **опції контексту**. Для всіх тестів (або всіх тестів папки) їх задають перевизначенням фікстури в `conftest.py`:

```python
@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    return {**browser_context_args, "locale": "uk-UA", "timezone_id": "Europe/Kyiv", "viewport": {"width": 1440, "height": 900}}
```

Для одного тесту — маркер pytest-playwright:

```python
@pytest.mark.browser_context_args(viewport={"width": 390, "height": 844})
def test_todo_counter_on_a_phone(page: Page):
    page.goto("/playground/todo")
    expect(page.get_by_test_id("todo-counter")).to_be_visible()
```

| Спосіб | Коли |
|---|---|
| `browser_context_args` у `conftest.py` | налаштування для всіх тестів папки чи проєкту |
| `@pytest.mark.browser_context_args(...)` | інше вікно / локаль для окремого тесту |
| `page.set_viewport_size({...})` | змінити розмір вікна посеред тесту або в параметризованому тесті |
| `--device "iPhone 13"` | увесь запуск як на пристрої (екран, user agent, touch) |

```python
@pytest.mark.parametrize("width", [320, 375, 414])
def test_todo_has_no_horizontal_scroll(page: Page, width):
    page.set_viewport_size({"width": width, "height": 800})
    page.goto("/playground/todo")
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
```

`page.evaluate(...)` виконує JavaScript на сторінці і повертає результат у Python. Для розмітки, що вже не змінюється після завантаження, звичайний `assert` над ним доречний.

## Timeouts

```python
expect.set_options(timeout=10_000)   # перевірки expect — у conftest.py, для всього запуску
page.set_default_timeout(10_000)     # дії й очікування цієї сторінки
```

Збільшуй timeouts для повільного стенду цілеспрямовано, а не «про всяк випадок»: великий timeout робить падіння дуже повільними.

## Типові помилки

- Увімкнули `-n auto`, і тести «випадково» падають: шукай спільні дані й залежність від порядку.
- `browser_context_args` без `**browser_context_args` усередині — губляться налаштування плагіна (наприклад, `--base-url`).
- Опції, потрібні лише одному тесту, — у глобальному `conftest.py`: змінюються всі тести.
- Маркери не зареєстровані в `pytest.ini` — `-m smoke` мовчки не знаходить тестів через опечатку.

## Підсумок

- `pytest -n auto` (pytest-xdist) запускає тести паралельно в окремих процесах-воркерах.
- Паралельність вимагає незалежності: свої дані, без порядку, без глобальних підрахунків і спільних файлів.
- `pytest.ini`: `testpaths`, `pythonpath`, `addopts`, `markers`.
- Опції контексту — `browser_context_args` (для всіх) або маркер (для одного тесту); `set_viewport_size` — посеред тесту.
- Timeouts налаштовують централізовано і свідомо.
