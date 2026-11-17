# Асинхронний HTTP з httpx

`requests` — синхронна бібліотека: в асинхронному коді вона блокує весь цикл подій. Асинхронний аналог з майже тим самим інтерфейсом — **httpx** і його `AsyncClient` (він уже знайомий тобі з тестів FastAPI). Приклад — сервіс, що збирає прогнози погоди для міст.

## Клієнт

```python
import httpx

async def main():
    async with httpx.AsyncClient(
        base_url="https://api.weather.test",
        headers={"Authorization": f"Bearer {TOKEN}"},
        timeout=httpx.Timeout(3.0),
    ) as client:
        response = await client.get("/forecast", params={"city": "Lviv"})
        response.raise_for_status()
        data = response.json()
```

- **Один клієнт на багато запитів**: він тримає пул з'єднань і перевикористовує їх. Новий `AsyncClient` на кожен запит — повільно й марнотратно.
- `async with` закриває з'єднання наприкінці.
- Тайм-аут за замовчуванням у httpx — 5 секунд; задавай свій під кожного партнера.

## Відповідь і помилки

| Ситуація | Що отримаєш |
|---|---|
| сервер відповів 404 / 500 | **жодного винятку**: `response.status_code == 404` |
| те саме + `response.raise_for_status()` | `httpx.HTTPStatusError` (у ньому є `.response`) |
| домену не існує, з'єднання відхилено | `httpx.ConnectError` |
| сервер мовчить довше за тайм-аут | `httpx.ReadTimeout` / `ConnectTimeout` (нащадки `httpx.TimeoutException`) |
| `response.json()` на HTML-сторінці помилки | `json.JSONDecodeError` |

Усі мережеві помилки httpx — нащадки `httpx.RequestError`, а помилки статусу — `httpx.HTTPStatusError`; обидва — нащадки `httpx.HTTPError`.

## Багато запитів разом — і з обмеженням

```python
async def forecasts(client, cities, limit=5):
    gate = asyncio.Semaphore(limit)

    async def one(city):
        async with gate:
            response = await client.get("/forecast", params={"city": city})
            if response.status_code == 404:
                return None                  # невідоме місто — не помилка
            response.raise_for_status()
            return response.json()

    return await asyncio.gather(*(one(city) for city in cities))
```

## Пагінація: асинхронний генератор

API рідко віддає все одразу. Зручно сховати сторінки за **асинхронним генератором**:

```python
async def iter_alerts(client):
    page = 1
    while page is not None:
        response = await client.get("/alerts", params={"page": page})
        response.raise_for_status()
        body = response.json()
        for alert in body["items"]:
            yield alert                      # async def + yield = асинхронний генератор
        page = body["next_page"]

async for alert in iter_alerts(client):      # перебір — через async for
    if alert["level"] == "red":
        break                                # наступні сторінки навіть не запитуються
```

Генератор **лінивий**: нова сторінка запитується лише тоді, коли попередню вже перебрали. `break` — і решта сторінок не завантажується.

## Тести без мережі: MockTransport

```python
def handler(request: httpx.Request) -> httpx.Response:
    city = request.url.params["city"]
    if city == "Atlantis":
        return httpx.Response(404)
    return httpx.Response(200, json={"city": city, "temp": 12})

client = httpx.AsyncClient(transport=httpx.MockTransport(handler), base_url="https://api.weather.test")
```

`MockTransport` підміняє мережу функцією: тест бачить кожен запит (`request.url`, заголовки, тіло) і сам вирішує, що відповісти, — 404, 500, повільну відповідь (асинхронний обробник з `await asyncio.sleep`). Тому код приймає `client` **параметром**, а не створює його всередині.

## Типові помилки

| Помилка | Наслідок |
|---|---|
| `requests` в `async def` | блокує цикл подій |
| Новий `AsyncClient` у кожній функції | немає перевикористання з'єднань; не підміниш у тесті |
| Немає `raise_for_status()` | 500 «проходить» як успіх, далі падає `json()` або логіка |
| `gather` на тисячі запитів без семафора | `429` від партнера |
| `for` замість `async for` по асинхронному генератору | `TypeError: 'async_generator' object is not iterable` |

> [!QA]
> `MockTransport` дає повний контроль над «мережею»: можна перевірити, які саме запити пішли (шлях, параметри, заголовок авторизації), скільки разів, у якому порядку, і як код поводиться на 404, 500, повільній відповіді чи зламаному JSON — без жодного справжнього сервера.

## Підсумок

- `httpx.AsyncClient` — асинхронний клієнт; один на багато запитів, через `async with`.
- Статус 4xx / 5xx — не виняток, доки не викличеш `raise_for_status()`; мережеві збої — `RequestError`.
- Багато запитів — `gather` + `Semaphore`.
- Пагінація — асинхронний генератор (`async def` + `yield`) і `async for`; він лінивий.
- Тести — `httpx.MockTransport` і клієнт, переданий параметром.
