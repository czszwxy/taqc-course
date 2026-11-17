# Просунуті інструменти: власні перевірки, очікування, кроки

Базових `click`, `fill` і `expect(locator)` вистачає для 80 % тестів. Решта 20 % — перевірки, що повторюються в десятках тестів, значення, яких немає на сторінці, і довгі сценарії, у звіті яких нічого не зрозуміло. Для них потрібні окремі прийоми — саме про них питають на співбесідах на рівень вище junior.

> [!QA]
> Мета цих інструментів одна: коли тест упав, звіт має одразу казати **що саме** пішло не так. «Ціна має бути 2,749 UAH» замість «AssertionError» і «крок "Оплата"» замість «рядок 87».

## Власні перевірки — функції з expect

Якщо та сама перевірка з тим самим форматуванням трапляється в десятках тестів, її виносять у функцію:

```python
from playwright.sync_api import Locator, expect


def expect_uah(locator: Locator, amount: int) -> None:
    """The element shows the amount as "2,749 UAH"."""
    expected = f"{amount:,} UAH"
    expect(locator, f"the price should be {expected}").to_have_text(expected)


# у тесті
expect_uah(page.get_by_test_id("order-total"), 2749)
```

## Розбір: з чого складається добра функція-перевірка

| Частина | Навіщо |
|---|---|
| назва з `expect_…` | у тесті читається як перевірка, а не як дія |
| параметри — локатор і дані | правило форматування живе в одному місці |
| `expect(locator, "повідомлення")` | другий аргумент `expect` — текст, який з'явиться у звіті |
| `to_have_text(...)` всередині | перевірка **чекає**, як усі web-first перевірки |
| жодного `return` | перевірка або проходить, або піднімає `AssertionError` |

Такі функції живуть в окремому модулі (наприклад, `helpers/expectations.py`), а не в page object: page object знає локатори й дії, перевірки лишаються на боці тестів.

## Значення не з локатора: чекати, а не читати один раз

`expect(locator)` чекає сам, бо вміє перечитати елемент. Але `page.evaluate(...)` і відповідь API повертають уже готове значення — перечитати його нічим. Якщо воно з'являється із затримкою, разове читання дає нестабільний тест.

**У браузері** — `page.wait_for_function`: чекає, поки JavaScript-вираз стане істинним.

```python
page.get_by_role("button", name="Dark theme").click()
page.wait_for_function("key => localStorage.getItem(key) === 'dark'", arg="theme")
```

Якщо умова так і не виконалась, буде `TimeoutError` — тест упаде. Дані в функцію передають через `arg` (кілька значень — списком), а не вклеюють у рядок.

**На сервері** — власний невеликий помічник:

```python
import time


def wait_until(check, timeout: float = 5.0, interval: float = 0.25, message: str = "condition"):
    """Calls check() until it returns a truthy value; raises AssertionError after the timeout."""
    deadline = time.monotonic() + timeout
    while True:
        value = check()
        if value:
            return value
        if time.monotonic() >= deadline:
            raise AssertionError(f"Timed out after {timeout} s waiting for {message}")
        time.sleep(interval)


wait_until(lambda: api.get(f"exports/{export_id}").json()["status"] == "ready", message="the export to be ready")
```

## Розбір: чим polling відрізняється від sleep

| | `time.sleep(5)` перед перевіркою | `wait_until(...)` |
|---|---|---|
| Готово за 0.3 с | тест усе одно чекає 5 с | продовжує через 0.3 с |
| Готово за 7 с | перевірка падає | падає з повідомленням «чекали … 5 с» — або збільшуєш `timeout` свідомо |
| Що у звіті | `AssertionError` без пояснень | на що саме чекали |

`time.sleep` усередині циклу з умовою і дедлайном — нормальна техніка. Погана практика — «сліпа» пауза **замість** умови.

## Кроки у звіті — allure.step

Довгий сценарій у звіті — це один рядок «failed». Кроки ділять його на осмислені частини:

```python
import allure


def test_guest_can_book_a_table(page):
    with allure.step("Open the booking form"):
        page.goto("/booking")
        page.get_by_role("button", name="Book a table").click()

    with allure.step("Fill in the details"):
        page.get_by_label("Guests").fill("4")
        page.get_by_label("Date").fill("2026-06-01")

    with allure.step("Confirm the booking"):
        page.get_by_role("button", name="Confirm").click()
        expect(page.get_by_test_id("booking-code")).to_have_text(re.compile(r"^BK-\d{4}$"))
```

Кроки потрапляють у звіт Allure, якщо запускати з `--alluredir`; без цієї опції `allure.step` нічого не ламає. Функцію теж можна зробити кроком — декоратором `@allure.step("Sign in as {email}")`. Крок — це дія користувача з кількох рядків, а не кожен клік.

## Таймаути окремих перевірок

| Запис | Що змінює |
|---|---|
| `expect(locator).to_have_text("Ready", timeout=15_000)` | одну перевірку, яка законно триває довше |
| `expect.set_options(timeout=10_000)` у `conftest.py` | усі перевірки проєкту |
| `page.wait_for_function(js, timeout=15_000)` | одне очікування |

Збільшуй таймаут там, де процес справді довгий (генерація звіту), а не «про всяк випадок» для всього.

## Коли тест не має просто «пройти»

| Ситуація | pytest |
|---|---|
| функції немає в цьому середовищі | `@pytest.mark.skip(reason="…")` або `skipif(умова, reason="…")` |
| відомий баг продукту — хочу дізнатися, коли його виправлять | `@pytest.mark.xfail(reason="BUG-123", strict=True)` |
| зламаний сам тест, є задача на виправлення | `@pytest.mark.skip(reason="fix the test: TEST-45")` |
| свідомо довгий тест | власний маркер `@pytest.mark.slow` і запуск `-m "not slow"` на PR |

## Типові помилки

- `assert page.evaluate(...) == ...` для значення, що з'являється із затримкою, — одна спроба; потрібен `wait_for_function`.
- Функція-перевірка з `inner_text()` і `assert` усередині — вона не чекає і додає нестабільності.
- Дані, вклеєні в JavaScript через f-рядок, — лапки в значенні ламають вираз; передавай через `arg`.
- `allure.step` на кожен рядок — звіт стає шумом.
- `skip` без причини для тесту з відомим багом — баг забудуть; для цього є `xfail(strict=True)`.

## Підсумок

- Повторювану перевірку — у функцію `expect_…` з повідомленням і web-first перевіркою всередині.
- Значення з браузера (storage, змінні) — `page.wait_for_function`; із сервера — `wait_until` з дедлайном.
- `allure.step` — назви кроків у звіті.
- `timeout=` — для окремої довгої перевірки, а не для всіх.
- `skip` / `xfail(strict=True)` / власні маркери чесно кажуть, чому тест не «зелений як усі».
