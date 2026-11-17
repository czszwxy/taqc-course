# Тестування асинхронного коду

У задачах модуля ти вже бачив(ла) асинхронні тести: фейкові сервіси з лічильниками, `MockTransport`, підмінений `sleep`. Тепер — систематично: як писати такі тести самому(-ій) і робити їх **детермінованими** — однаковими на швидкому ноутбуці, повільному CI й у браузері.

## pytest-asyncio

```python
import pytest
import pytest_asyncio

@pytest_asyncio.fixture
async def feed_client():
    client = FeedClient(base_url="https://news.test")
    yield client
    await client.close()

@pytest.mark.asyncio
async def test_latest_headlines(feed_client):
    headlines = await feed_client.latest(limit=3)
    assert len(headlines) == 3
```

- `@pytest.mark.asyncio` — тест є корутиною; плагін запускає його у власному циклі подій (свіжому для кожного тесту).
- Асинхронна фікстура — через `@pytest_asyncio.fixture` (у суворому режимі за замовчуванням звичайний `@pytest.fixture` для `async def` не спрацює).
- Без плагіна теж можна: звичайний тест з `asyncio.run(...)` усередині.
- Багато проєктів вмикають `asyncio_mode = "auto"` у налаштуваннях pytest — тоді позначки не потрібні. У курсі — суворий режим, щоб було видно, що відбувається.

## AsyncMock

```python
from unittest.mock import AsyncMock

fetch = AsyncMock(return_value={"temp": 12})               # кожен await повертає це
fetch = AsyncMock(side_effect=[TimeoutError(), {"temp": 12}])   # спершу виняток, потім значення

async def lookup(city):
    return {"temp": len(city)}
fetch = AsyncMock(side_effect=lookup)                      # відповідь з аргументів

await service.forecast("Lviv")
fetch.assert_awaited_once_with("Lviv")                     # рівно один await з цими аргументами
assert fetch.await_count == 1
fetch.assert_not_awaited()                                 # напр. після влучання в кеш
```

`assert_called_once()` пройде, навіть якщо корутину створили, але **не дочекалися** (забутий `await`). Для асинхронних моків перевіряй саме `awaited`.

## Час — це залежність

Повтори, тайм-аути, кеші з терміном життя залежать від часу. Тест, що чекає справжні секунди, повільний і нестабільний. Час передають у код **параметром**:

```python
class Forecasts:
    def __init__(self, fetch, ttl=600, clock=time.monotonic):
        ...

class FakeClock:
    def __init__(self):
        self.now = 1000.0
    def __call__(self):
        return self.now

clock = FakeClock()
cache = Forecasts(fetch, ttl=600, clock=clock)
await cache.get("Lviv")
clock.now += 600                     # «минуло 10 хвилин» — миттєво
await cache.get("Lviv")
assert fetch.await_count == 2
```

Те саме для пауз: `sleep=asyncio.sleep` параметром, у тесті — фейк, що записує затримки.

## Притримати виклик: asyncio.Event

Як перевірити, що два одночасні `get("Lviv")` роблять **один** запит? Треба, щоб перший запит ще «висів», коли прийде другий. Не `sleep(0.1)` «на око», а подія:

```python
release = asyncio.Event()

async def slow_fetch(city):
    await release.wait()             # чекає, доки тест не дозволить
    return {"temp": 12}

fetch = AsyncMock(side_effect=slow_fetch)
first = asyncio.create_task(cache.get("Lviv"))
second = asyncio.create_task(cache.get("Lviv"))
await asyncio.sleep(0)               # дати задачам дійти до очікування
release.set()
assert await first == await second
assert fetch.await_count == 1
```

## Детерміновані тести

| Нестабільно | Надійно |
|---|---|
| `await asyncio.sleep(0.5)` і «мабуть, фонове вже завершилось» | `await task` або `asyncio.Event` |
| `assert elapsed < 0.2` | лічильник одночасних викликів у фейку |
| справжній час у кешах і повторах | фейковий годинник / `sleep` параметром |
| справжній HTTP у юніт-тесті | `httpx.MockTransport`, `AsyncMock` |
| порядок `as_completed` при однакових затримках | різні затримки або перевірка множини |

## Типові помилки

| Помилка | Наслідок |
|---|---|
| Асинхронний тест без `@pytest.mark.asyncio` | тест «проходить», нічого не виконавши (з попередженням), або не запускається |
| `@pytest.fixture` над `async def` у суворому режимі | помилка «requested an async fixture… with no plugin» |
| `assert_called_once` замість `assert_awaited_once` | не помітить забутий `await` |
| `sleep` для синхронізації | тест падає «інколи» на повільному CI |

> [!QA]
> Нестабільний асинхронний тест гірший за відсутній: його перестають помічати. Якщо тест «іноді падає», шукай у ньому `sleep`, міряння часу, спільний стан між тестами або справжню мережу — і заміни їх на події, лічильники й фейки.

## Підсумок

- `@pytest.mark.asyncio` для тестів-корутин, `@pytest_asyncio.fixture` для асинхронних фікстур.
- `AsyncMock`: `return_value`, `side_effect` (список чи функція), `assert_awaited_once_with`, `await_count`, `assert_not_awaited`.
- Час і паузи — залежності: фейковий годинник і фейковий `sleep`.
- `asyncio.Event` притримує виклик, лічильники перевіряють конкурентність; жодних `sleep` «на око».
