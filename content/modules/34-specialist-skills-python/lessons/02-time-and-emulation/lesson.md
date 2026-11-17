# Час, мережа й пристрій у тестах

Деякі вимоги неможливо перевірити «чесно»: сесія завершується через 15 хвилин бездіяльності, банер зникає через 5 секунд, сайт показує найближчий магазин, а без інтернету — попередження. Чекати 15 хвилин у тесті не можна, їхати в інше місто — теж. Playwright дозволяє **керувати** часом, мережею й «пристроєм» браузера.

> [!QA]
> Баги, пов'язані з часом і середовищем, — класика продакшну: «о 00:00 зламалось», «у користувачів з Канади інша дата», «без мережі кнопка працює і губить замовлення». Той, хто вміє це автоматизувати, знаходить дефекти, яких не бачить ніхто інший.

## Фальшивий годинник: page.clock

```python
def test_session_warning_appears_after_14_minutes(page):
    page.clock.install(time="2026-05-10T09:00:00Z")
    page.goto("/dashboard")
    warning = page.get_by_role("dialog", name="Are you still there?")

    page.clock.pause_at("2026-05-10T09:13:59Z")
    expect(warning).to_have_count(0)

    page.clock.fast_forward("00:01")
    expect(warning).to_be_visible()
```

| Метод | Що робить |
|---|---|
| `clock.install(time=…)` | підміняє `Date`, `setTimeout`, `setInterval` тощо; час **іде далі** від заданого моменту |
| `clock.pause_at(time)` | перестрибує до моменту і **зупиняє** час |
| `clock.fast_forward("05:00")` | стрибок уперед («закрив ноутбук — відкрив за 5 хвилин»); таймери, чий час настав, спрацьовують один раз |
| `clock.run_for(2000)` | «проживає» інтервал, запускаючи всі таймери по дорозі |
| `clock.resume()` | час знову йде сам |
| `clock.set_fixed_time(time)` | лише фіксує `Date.now()`; таймери працюють як звичайно |

Момент часу — рядок ISO (`"2026-05-10T09:00:00Z"`, літера `Z` означає UTC) або `datetime`. Тривалість — мілісекунди (`5000`) або рядок `"mm:ss"` / `"hh:mm:ss"`.

## Розбір: чому саме install → goto → pause_at

| Крок | Що відбувається з часом |
|---|---|
| `install(time="…09:00:00Z")` | сторінка думатиме, що зараз 09:00:00; час тече |
| `goto(...)` | сторінка завантажується і запускає свої таймери вже за фальшивим годинником |
| `pause_at("…09:13:59Z")` | стрибок і зупинка: тепер нічого не зміниться, поки ти не скажеш |
| перевірка | стан стабільний — немає «іноді 09:13:59, іноді 09:14:00» |
| `fast_forward("00:01")` | рівно секунда вперед — і наступна перевірка |

- `install` викликай **до** `goto` і до будь-яких інших методів годинника.
- `pause_at` приймає лише момент **у майбутньому** відносно фальшивого часу: після `install` час уже тече, тож пауза «на ту саму секунду» дасть помилку `Cannot fast-forward to the past`.
- Якщо треба лише «сьогодні 1 січня» без керування таймерами — досить `set_fixed_time`.

## Мережа: офлайн

```python
def test_draft_is_kept_while_offline(page, context):
    page.goto("/notes")
    context.set_offline(True)
    page.get_by_label("Note").fill("Call the supplier")
    expect(page.get_by_text("Saved locally")).to_be_visible()

    context.set_offline(False)
    expect(page.get_by_text("Synced")).to_be_visible()
```

`context.set_offline(True)` вимикає мережу для всього контексту: браузер отримує подію `offline`, а запити падають. Це перевірка поведінки **застосунку** без мережі; для окремих відповідей (500, повільно) є `page.route`.

## Геолокація й дозволи

У pytest-playwright налаштування контексту для одного тесту задає маркер `browser_context_args`:

```python
import pytest

KYIV = {"latitude": 50.45, "longitude": 30.52}


@pytest.mark.browser_context_args(geolocation=KYIV, permissions=["geolocation"])
def test_weather_for_the_current_city(page):
    page.goto("/weather")
    expect(page.get_by_role("heading", name="Kyiv")).to_be_visible()
```

Без `permissions=["geolocation"]` браузер **відмовляє** сторінці в доступі — це готовий негативний сценарій «користувач заборонив геолокацію». Змінити координати посеред тесту можна через `context.set_geolocation(...)`.

## Часовий пояс, локаль, тема

| Опція | Приклад | На що впливає |
|---|---|---|
| `timezone_id` | `"Europe/Kyiv"`, `"America/New_York"` | `new Date()`, `Intl` — показ часу |
| `locale` | `"uk-UA"`, `"en-US"` | `navigator.language`, формат дат і чисел |
| `color_scheme` | `"dark"` | `prefers-color-scheme` |
| `viewport` | `{"width": 375, "height": 812}` | розмір вікна |

Часовий пояс особливо цінно поєднувати з годинником: «о 12:00 UTC у Києві має бути 14:00».

## Де задавати налаштування

| Місце | Діє на |
|---|---|
| `@pytest.mark.browser_context_args(...)` | один тест (або клас) |
| фікстура `browser_context_args` у `conftest.py` | усі тести папки |
| фікстура `new_context(...)` у тесті | один додатковий контекст (другий користувач, інша країна) |
| опції запуску: `--device "Pixel 7"`, `--browser firefox` | цілий прогін |

Перевизначення фікстури для всіх тестів:

```python
@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    return {**browser_context_args, "locale": "uk-UA", "timezone_id": "Europe/Kyiv"}
```

> [!NOTE]
> Опція `--device` задає одразу viewport, user agent і touch. У лабораторії курсу user agent зайнятий службовою позначкою перевірки, тому в завданнях задавай `viewport`, `timezone_id`, `geolocation` окремо, а `--device` використовуй у власному проєкті.

## Типові помилки

- Справжнє очікування `time.sleep(5)`, щоб «дочекатися зникнення» — повільно й нестабільно; керуй годинником.
- `clock.install()` після `goto` — таймери сторінки вже створені за справжнім часом.
- Перевірка часу без `timezone_id` — тест зелений на твоєму ноутбуці й червоний у CI в UTC.
- Момент часу без `Z` або без `tzinfo` — він читається як місцевий час машини, і тест залежить від її поясу.
- Геолокація без дозволу — сторінка отримує відмову, а тест «не розуміє чому».

## Підсумок

- `page.clock`: `install` → `goto` → `pause_at` → `fast_forward` — час під твоїм контролем.
- `context.set_offline(True / False)` — поведінка без мережі.
- `geolocation` + `permissions` — «де користувач» і «чи дозволив».
- `timezone_id`, `locale`, `color_scheme`, `viewport` — середовище користувача.
- Налаштування — маркером `browser_context_args`, фікстурою або окремим контекстом.
