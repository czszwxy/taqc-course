# API-тести з Playwright: APIRequestContext

У Playwright є власний HTTP-клієнт — **APIRequestContext**. Він надсилає ті самі запити, що й requests, але живе всередині Playwright: його можна поєднати з браузером в одному тесті, він потрапляє в трейси і вміє ділити cookies зі сторінкою. Коли проєкт уже на Playwright, API-тести часто пишуть ним, щоб не тримати два інструменти.

## Контекст і фікстура

```python
import pytest


@pytest.fixture(scope="session")
def public_api(playwright, base_url):
    context = playwright.request.new_context(base_url=f"{base_url}/api/")
    yield context
    context.dispose()
```

| Рядок | Що робить |
|---|---|
| `playwright` | фікстура pytest-playwright (scope session) |
| `request.new_context(base_url=…)` | створює HTTP-клієнт; усі шляхи в запитах — відносно `base_url` |
| `yield context` | віддає клієнт тестам |
| `context.dispose()` | закриває його після всіх тестів (як `session.close()` у requests) |

## Запити й відповіді

```python
def test_laptops_filter(public_api):
    response = public_api.get("products", params={"category": "Laptops"})

    assert response.status == 200
    assert response.json()["total"] == 3
    assert response.headers["content-type"].startswith("application/json")
```

| requests | Playwright |
|---|---|
| `requests.get(url, params=…)` | `context.get("path", params=…)` |
| `requests.post(url, json=body)` | `context.post("path", data=body)` — словник іде як JSON |
| `response.status_code` | `response.status` |
| `response.json()` | `response.json()` |
| `response.text` | `response.text()` — метод |
| `response.headers["Content-Type"]` | `response.headers["content-type"]` — назви в нижньому регістрі |
| `timeout=5` (секунди) | `timeout=5000` (мілісекунди) |
| `response.raise_for_status()` | `fail_on_status_code=True` у запиті |
| `requests.Session()` + `headers.update(...)` | `new_context(extra_http_headers=…)` |

## Пастка зі слешем

```python
context = playwright.request.new_context(base_url="http://localhost:5173/api/")

context.get("products")    # → http://localhost:5173/api/products   ✓
context.get("/products")   # → http://localhost:5173/products       ✗ слеш на початку «скидає» /api
```

Адреса будується за правилами посилань у браузері: шлях зі слешем на початку відраховується від кореня сайту. Тому `base_url` закінчується слешем, а шляхи в запитах — без слеша на початку.

## Автентифікація

```python
@pytest.fixture(scope="session")
def admin_api(playwright, base_url, admin_token):
    context = playwright.request.new_context(
        base_url=f"{base_url}/api/",
        extra_http_headers={"Authorization": f"Bearer {admin_token}"},
    )
    yield context
    context.dispose()
```

`extra_http_headers` додаються до **кожного** запиту цього контексту. Для сайтів з сесією в cookies є ще простіший шлях: `page.request` ділить cookies зі сторінкою, тож після входу через UI API-запити теж «залогінені».

## Перевірки expect для відповіді

```python
from playwright.sync_api import expect

expect(response).to_be_ok()        # статус 200–299
expect(response).not_to_be_ok()
```

`to_be_ok()` у разі падіння показує статус і тіло відповіді. Точний статус (201, 204, 403) все одно перевіряй через `response.status == …`.

## requests чи Playwright?

| Обирай requests, коли… | Обирай Playwright API, коли… |
|---|---|
| проєкт — лише API-тести, браузер не потрібен | поруч є UI-тести на Playwright |
| потрібні можливості requests (адаптери, сертифікати, проксі) | треба ділити cookies / стан зі сторінкою |
| команда вже має клієнти на requests | хочеш бачити API-запити в трейсі Playwright |

> [!QA]
> Інструмент менш важливий за перевірки. Тест «статус 403 для чужого замовлення» однаково цінний на requests і на Playwright — головне, щоб він існував і перевіряв точний статус.

## Типові помилки

- Слеш на початку шляху при `base_url` з шляхом — запит іде не туди, часто 404.
- `timeout=5` в Playwright — це 5 **мілісекунд**, а не секунд.
- `response.text` без дужок — це метод, а не рядок.
- Контекст без `dispose()` — з'єднання лишаються відкритими до кінця процесу.
- Лише `expect(response).to_be_ok()` там, де вимога — конкретний `201`.

## Підсумок

- `playwright.request.new_context(base_url=…, extra_http_headers=…)` — HTTP-клієнт Playwright; у фікстурі з `yield` і `dispose()`.
- `get/post/put/patch/delete("шлях")`: `data` — тіло (словник = JSON), `params` — query string.
- `APIResponse`: `status`, `ok`, `json()`, `text()`, `headers` (назви в нижньому регістрі).
- `base_url` зі слешем у кінці, шляхи — без слеша на початку.
- `expect(response).to_be_ok()` — загальна перевірка; точні статуси — через `response.status`.
