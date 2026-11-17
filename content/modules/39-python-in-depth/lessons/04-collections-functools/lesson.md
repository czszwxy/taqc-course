# collections і functools

Половина задач бекенду — «порахувати», «згрупувати», «тримати останні N», «не рахувати те саме двічі». Для всього цього у стандартній бібліотеці вже є перевірені інструменти. Знати їх — означає писати коротший код з меншою кількістю помилок, і це одне з улюблених питань на співбесідах («як порахувати найчастіші елементи?» — `Counter`).

## Counter — порахувати

```python
from collections import Counter

statuses = Counter(order["status"] for order in orders)
statuses                    # Counter({'paid': 5, 'new': 2, 'cancelled': 1})
statuses["paid"]            # 5
statuses["refunded"]        # 0 — відсутній ключ не дає KeyError
statuses.most_common(2)     # [('paid', 5), ('new', 2)]
statuses.update(["new"])    # додати ще
```

`most_common(n)` повертає пари від найчастішої; при однаковій кількості — у порядку **першої появи**. Лічильники можна додавати й віднімати: `today + yesterday`.

## defaultdict — групувати без перевірок

```python
from collections import defaultdict

by_domain = defaultdict(list)
for email in ["anna@shop.ua", "ivan@mail.com", "olha@shop.ua"]:
    by_domain[email.split("@")[1]].append(email)

dict(by_domain)
# {'shop.ua': ['anna@shop.ua', 'olha@shop.ua'], 'mail.com': ['ivan@mail.com']}
```

## Розбір: що робить by_domain[key] для нового ключа

| Крок | Звичайний `dict` | `defaultdict(list)` |
|---|---|---|
| `by_domain["shop.ua"]`, ключа немає | `KeyError` | викликає `list()` → `[]`, записує під ключ |
| `.append("anna@shop.ua")` | — | `{'shop.ua': ['anna@shop.ua']}` |
| той самий ключ удруге | — | бере наявний список і додає |

Аргумент — **фабрика**, яку викликають для нового ключа: `list`, `int` (дає `0` — для лічильників), `set`. Підступ: навіть **читання** відсутнього ключа (`if by_domain["x"]:`) створює запис. Для перевірки наявності — `"x" in by_domain` або `by_domain.get("x")`; назовні часто повертають звичайний `dict(...)`.

## deque — черга з двох кінців

`list.pop(0)` зсуває всі елементи — на великих списках це повільно (O(n)). `deque` додає й забирає з обох кінців за O(1):

```python
from collections import deque

recent_pages = deque(maxlen=3)
for page in ["/", "/catalog", "/cart", "/checkout"]:
    recent_pages.append(page)

recent_pages            # deque(['/catalog', '/cart', '/checkout'], maxlen=3)
recent_pages.popleft()  # '/catalog'
```

З `maxlen` найстаріші елементи випадають самі — зручно для «останніх N подій». `append` / `popleft` — черга задач (FIFO), `appendleft` / `pop` — з іншого боку.

## namedtuple і ChainMap

```python
from collections import ChainMap, namedtuple

Location = namedtuple("Location", ["lat", "lon"])
kyiv = Location(50.45, 30.52)
kyiv.lat            # 50.45 — і водночас це кортеж: lat, lon = kyiv

defaults = {"timeout": 30, "debug": False}
from_file = {"timeout": 10}
from_env = {"debug": True}
settings = ChainMap(from_env, from_file, defaults)
settings["timeout"], settings["debug"]     # (10, True) — шукає по шарах зліва направо
```

`namedtuple` — легкий незмінний запис (для чогось більшого — `@dataclass`). `ChainMap` нічого не копіює: шукає ключ спершу в першому словнику, потім у наступних — саме так влаштовані шари налаштувань.

## functools.lru_cache і cache — запам'ятати результат

```python
from functools import cache


@cache
def shipping_zone(city):
    print(f"calculating zone for {city}")     # «дорога» робота
    return "A" if city in {"Kyiv", "Lviv"} else "B"


shipping_zone("Kyiv")   # друкує і повертає 'A'
shipping_zone("Kyiv")   # 'A' одразу, без друку — з кешу
shipping_zone.cache_info()   # CacheInfo(hits=1, misses=1, maxsize=None, currsize=1)
```

| | `@cache` | `@lru_cache(maxsize=128)` |
|---|---|---|
| Розмір | необмежений | не більше `maxsize` записів |
| Що випадає | нічого | найдавніше використаний (Least Recently Used) |
| Скинути | `.cache_clear()` | `.cache_clear()` |

Ключ кешу — аргументи виклику, тому вони мають бути **хешовані**: список як аргумент дасть `TypeError: unhashable type`. І кешуй лише те, що не змінюється: ціна, яку змінили в базі, з кешу не зникне сама. `lru_cache(maxsize=...)` можна застосувати і як звичайну функцію: `cached_fetch = lru_cache(maxsize=100)(fetch)`.

## functools.partial — зафіксувати аргументи

```python
from functools import partial

def send(channel, to, text): ...

send_sms = partial(send, "sms")
send_sms("+380501112233", "Your code: 4821")   # те саме, що send("sms", "+380...", "...")
```

`partial` зручний, коли треба передати функцію як callback, а частина аргументів уже відома.

## Типові помилки

- `defaultdict`: перевірка `if groups[key]` створює порожній запис для кожного перевіреного ключа.
- `list.pop(0)` у циклі на тисячах елементів замість `deque.popleft()`.
- `lru_cache` для функції, чий результат змінюється (курси валют, ціни) без скидання кешу.
- `lru_cache` зі списком чи словником в аргументах — `unhashable type`.
- Власний підрахунок через `dict.get(key, 0) + 1` там, де вистачило б `Counter`.

## Підсумок

- `Counter` — підрахунок і `most_common(n)`; відсутній ключ дає `0`.
- `defaultdict(list / int / set)` — групування й лічильники без перевірок, але читання теж створює ключ.
- `deque` — черги та «останні N» (`maxlen`); `popleft` за O(1).
- `namedtuple` — легкий запис, `ChainMap` — пошук по шарах.
- `cache` / `lru_cache` — кеш за аргументами (хешованими); `partial` — зафіксовані аргументи.
