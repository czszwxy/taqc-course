# Конкурентне виконання

`await` по черзі — це все ще «послідовно»: друга корутина почнеться, коли закінчиться перша. Щоб запити йшли **одночасно**, корутини перетворюють на **задачі** (tasks), і цикл подій веде їх паралельно в часі.

Приклад — агрегатор новин, що збирає стрічки з кількох джерел:

```python
async def fetch_feed(source: str) -> list[str]:
    await asyncio.sleep(1)                      # мережа
    return [f"{source}: headline"]
```

## gather

```python
feeds = await asyncio.gather(fetch_feed("sport"), fetch_feed("tech"), fetch_feed("culture"))
# ≈ 1 с замість 3; feeds — список у ПОРЯДКУ АРГУМЕНТІВ, а не завершення
```

З довільною кількістю: `await asyncio.gather(*(fetch_feed(s) for s in sources))`.

Що, якщо одне джерело впало?

| Виклик | Поведінка |
|---|---|
| `gather(a, b, c)` | перший виняток летить з `await gather(...)`; **інші задачі не скасовуються** й працюють далі у фоні |
| `gather(a, b, c, return_exceptions=True)` | винятки повертаються **в списку результатів** на своїх місцях |

```python
results = await asyncio.gather(*(fetch_feed(s) for s in sources), return_exceptions=True)
ok = [r for r in results if not isinstance(r, Exception)]
```

## create_task: почати зараз, дочекатися пізніше

```python
task = asyncio.create_task(fetch_feed("weather"))   # уже виконується у фоні
headlines = await load_cached_headlines()
weather = await task                                # чекаємо, коли знадобиться
```

Тримай посилання на задачу (змінна, список): цикл подій зберігає лише слабке посилання, і «забута» задача може зникнути до завершення.

## TaskGroup: структурована конкурентність

```python
async def build_front_page():
    async with asyncio.TaskGroup() as tg:
        sport = tg.create_task(fetch_feed("sport"))
        tech = tg.create_task(fetch_feed("tech"))
    # тут обидві задачі гарантовано завершені
    return {"sport": sport.result(), "tech": tech.result()}
```

`TaskGroup` (Python 3.11+) — сучасний спосіб «зробити кілька справ разом»:

- блок `async with` не закінчиться, поки не завершаться **всі** задачі групи;
- якщо одна впала — решту **скасовують**, і помилки вилітають разом як `ExceptionGroup`;
- задача не «загубиться» у фоні після виходу з функції.

```python
try:
    page = await build_front_page()
except* TimeoutError:
    page = fallback_page()                  # обробити лише тайм-аути з групи
```

`except*` ловить винятки потрібного типу з групи; інші летять далі.

## as_completed: хто перший

```python
for next_done in asyncio.as_completed([fetch_feed(s) for s in sources]):
    headlines = await next_done             # у порядку ЗАВЕРШЕННЯ
    show(headlines)
```

## Як перевірити, що код справді конкурентний

Результат «по черзі» і «одночасно» однаковий — відрізняється лише час. Тести не міряють секунди (це нестабільно), а **рахують** одночасні виклики у фейковому сервісі:

```python
class FakeFeeds:
    def __init__(self):
        self.in_flight = 0
        self.peak = 0

    async def fetch(self, source):
        self.in_flight += 1
        self.peak = max(self.peak, self.in_flight)
        await asyncio.sleep(0.01)
        self.in_flight -= 1
        return [source]
```

Після `gather` з трьох джерел `peak == 3`; після циклу з `await` — `peak == 1`.

## Типові помилки

| Помилка | Наслідок |
|---|---|
| `for s in sources: await fetch(s)` там, де можна разом | працює, але в N разів довше |
| `gather` і очікування, що результати йдуть у порядку завершення | вони в порядку аргументів |
| `gather` без `return_exceptions` і думка, що решта скасована | інші задачі тихо працюють далі |
| `create_task(...)` без збереженого посилання | задачу може прибрати збирач сміття |
| Звичайний `except ValueError` навколо `TaskGroup` | не спрацює: летить `ExceptionGroup`; потрібен `except*` |

> [!QA]
> Конкурентний код має три головні ризики: порядок результатів, поведінка при частковій помилці (що з рештою?) і «завислі» фонові задачі. Для кожного — окремий тест: перевір порядок у відповіді, результат при одній помилці і що повільні виклики скасовано.

## Підсумок

- `gather` — разом, результати в порядку аргументів; `return_exceptions=True` — помилки в списку.
- `create_task` — почати зараз, `await` пізніше; зберігай посилання.
- `TaskGroup` — чекає на всіх, при помилці скасовує решту, кидає `ExceptionGroup` (`except*`).
- `as_completed` — результати в порядку завершення.
- Конкурентність у тестах перевіряють лічильником одночасних викликів, а не секундоміром.
