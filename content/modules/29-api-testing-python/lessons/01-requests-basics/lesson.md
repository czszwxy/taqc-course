# HTTP-запити з requests

У модулі про HTTP ти надсилав(ла) запити руками в API console й Postman. Автотест робить те саме, але за мілісекунди і щоразу однаково. У Python для цього найчастіше беруть бібліотеку **requests**: вона надсилає HTTP-запит одним рядком, а pytest перевіряє відповідь звичайним `assert`.

> [!QA]
> API-тести — середній поверх піраміди тестування: вони швидші й стабільніші за UI-тести, а знаходять більшість помилок бізнес-логіки. Тому в команді їх зазвичай більше, ніж UI-тестів.

## Перший запит

```python
import requests

TIMEOUT = 5  # секунд

response = requests.get("http://localhost:5173/api/products/5", timeout=TIMEOUT)

print(response.status_code)   # 200
print(response.json())        # {'id': 5, 'name': 'Laptop Air 13', 'category': 'Laptops', ...}
```

| Що є в `response` | Що це |
|---|---|
| `status_code` | статус відповіді: `200`, `404`… |
| `ok` | `True` для статусів 200–399 |
| `json()` | тіло, розібране з JSON у словник чи список Python |
| `text` | тіло як рядок (зручно для повідомлень про помилку) |
| `headers` | заголовки відповіді (назви без урахування регістру: `headers["content-type"]`) |
| `elapsed` | скільки тривав запит: `response.elapsed.total_seconds()` |
| `request.headers` | що **надіслали** ми |

## Методи й аргументи

```python
requests.get(url, params={"inStock": "false", "limit": 3}, timeout=TIMEOUT)
requests.post(url, json={"email": "qa@gadgetly.test", "password": "wrong"}, timeout=TIMEOUT)
requests.patch(url, json={"quantity": 2}, headers={"Authorization": f"Bearer {token}"}, timeout=TIMEOUT)
requests.delete(url, headers=headers, timeout=TIMEOUT)
```

| Аргумент | Куди потрапляє |
|---|---|
| `params={...}` | у query string: `?inStock=false&limit=3` |
| `json={...}` | у тіло як JSON + заголовок `Content-Type: application/json` |
| `data={...}` | у тіло як **форма** (`a=1&b=2`), не JSON |
| `headers={...}` | у заголовки запиту |
| `timeout=5` | скільки секунд чекати відповідь, перш ніж здатися |

## Розбір: що відбувається під час `requests.get`

```python
response = requests.get(f"{API}/products", params={"inStock": "false", "limit": 3}, timeout=TIMEOUT)
```

| Крок | Що відбувається |
|---|---|
| 1 | requests складає адресу: `http://localhost:5173/api/products?inStock=false&limit=3` |
| 2 | додає свої заголовки (`User-Agent`, `Accept`…) і надсилає запит |
| 3 | чекає відповідь щонайбільше 5 с — інакше `requests.exceptions.Timeout` |
| 4 | повертає `Response`: статус, заголовки, тіло. **Помилкою** статус 404 чи 500 не вважається — це звичайна відповідь, яку перевіряє тест |

## Базова адреса — у фікстурі

Адресу стенду не пишуть у кожному тесті. pytest-base-url дає фікстуру `base_url` (зі `--base-url` або `pytest.ini`), а свою адресу API тест бере з власної фікстури:

```python
@pytest.fixture(scope="session")
def api(base_url):
    return f"{base_url}/api"


def test_laptop_air_has_a_price(api):
    response = requests.get(f"{api}/products/5", timeout=TIMEOUT)
    assert response.status_code == 200
    assert response.json()["price"] == 32999
```

## Session: спільні заголовки

Коли багато запитів іде з тим самим токеном, зручно створити **сесію**: заголовки задаються один раз, а з'єднання перевикористовується (швидше).

```python
session = requests.Session()
session.headers.update({"Authorization": f"Bearer {token}"})
me = session.get(f"{api}/me", timeout=TIMEOUT)
```

## raise_for_status

`response.raise_for_status()` кидає виняток для статусів 4xx / 5xx. Його ставлять у **допоміжних** функціях і фікстурах («вхід має вдатися, інакше далі немає сенсу»), але не в тестах, що навмисно перевіряють помилки: там статус 404 — очікуваний результат.

## Типові помилки

| Помилка | Що станеться |
|---|---|
| запит без `timeout` | якщо сервер завис, тест чекатиме вічно |
| `data=` замість `json=` | сервер отримає форму замість JSON і відповість 415 чи 400 |
| `f"{api}/products/"` і `"/5"` разом | подвійний слеш — інша адреса, часто 404 |
| `response.json()` на відповіді 204 | порожнє тіло → `JSONDecodeError` |
| лише `assert response.ok` | пройде і 200 замість очікуваного 201, і будь-який 3xx |

## Підсумок

- `requests.get/post/put/patch/delete` надсилають запит; `params` — у адресу, `json` — у тіло, `headers` — у заголовки.
- Завжди передавай `timeout`.
- `Response`: `status_code`, `json()`, `text`, `headers`, `elapsed`.
- Адреса API — у фікстурі з `base_url`; спільні заголовки — у `requests.Session`.
- Статуси помилок — звичайні відповіді: перевіряй їх точно, а `raise_for_status` лиши для допоміжного коду.
