# Ітератори та itertools

`for` працює зі списками, рядками, словниками, файлами, `range`, генераторами… Як один цикл розуміє такі різні речі? Через **протокол ітерації**. Коли розумієш його, можеш робити власні об'єкти, по яких ходить `for`: сторінки API, рядки великого файлу, записи з бази порціями — без завантаження всього в пам'ять.

## Iterable та iterator

| | Що вміє | Приклади |
|---|---|---|
| **Iterable** | дати ітератор: `iter(obj)` | `list`, `str`, `dict`, `range`, файл |
| **Iterator** | видавати наступний елемент: `next(it)`; коли елементи закінчились — `StopIteration` | результат `iter(...)`, генератор, файл |

```python
codes = [200, 404]
it = iter(codes)
next(it)    # 200
next(it)    # 404
next(it)    # StopIteration
```

## Розбір: що насправді робить for

`for code in codes: print(code)` Python виконує приблизно так:

| Крок | Дія |
|---|---|
| 1 | `it = iter(codes)` |
| 2 | `code = next(it)` → `200`, виконати тіло |
| 3 | `code = next(it)` → `404`, виконати тіло |
| 4 | `next(it)` кидає `StopIteration` → цикл тихо завершується |

Ітератор **одноразовий**: пройшов до кінця — він порожній. Список (iterable) можна обходити скільки завгодно, бо кожен `for` бере свіжий ітератор.

```python
it = iter([1, 2, 3])
list(it)    # [1, 2, 3]
list(it)    # [] — уже вичерпаний
```

## Власний iterable: __iter__ як генератор

Найпростіший спосіб зробити клас, по якому ходить `for`, — метод `__iter__` з `yield`:

```python
class Inventory:
    def __init__(self, stock):
        self.stock = stock                 # {"KB-01": 3, "MS-02": 0}

    def __iter__(self):
        for sku, count in self.stock.items():
            if count > 0:
                yield sku


for sku in Inventory({"KB-01": 3, "MS-02": 0, "HD-07": 1}):
    print(sku)      # KB-01, потім HD-07
```

Кожен `for` викликає `__iter__` заново й отримує новий генератор — тому такий об'єкт можна обходити багато разів. (Класи з власним `__next__` теж бувають, але генератор коротший і не має помилок зі збереженням стану.)

## yield from

`yield from other` віддає по черзі всі елементи іншого iterable:

```python
def all_skus(warehouses):
    for warehouse in warehouses:
        yield from warehouse       # замість: for sku in warehouse: yield sku
```

## itertools: готові «цеглинки»

| Функція | Що робить | Приклад використання |
|---|---|---|
| `islice(it, n)` | перші `n` елементів (ледачо) | взяти 3 з нескінченного генератора |
| `chain(a, b)` | спершу всі з `a`, потім з `b` | кешовані + щойно завантажені записи |
| `chain.from_iterable(lists)` | «розплющити» список списків | усі товари з усіх сторінок |
| `batched(it, n)` | кортежі по `n` (Python 3.12+) | вставляти в базу по 500 рядків |
| `pairwise(it)` | сусідні пари `(a, b), (b, c)` | різниця між сусідніми вимірами |
| `groupby(it, key)` | групи **сусідніх** елементів з однаковим ключем | події по днях |
| `accumulate(it)` | накопичувальні суми | баланс після кожної операції |
| `count(start)` | нескінченний лічильник | номери замовлень |

```python
from itertools import accumulate, batched, pairwise

list(batched([1, 2, 3, 4, 5], 2))      # [(1, 2), (3, 4), (5,)]
list(pairwise([10, 15, 30]))           # [(10, 15), (15, 30)]
list(accumulate([100, -30, 50]))       # [100, 70, 120]
```

## Розбір: groupby групує лише сусідів

```python
from itertools import groupby

events = ["login", "login", "view", "login"]
[(key, len(list(group))) for key, group in groupby(events)]
# [('login', 2), ('view', 1), ('login', 1)]
```

| Елемент | Ключ | Що відбувається |
|---|---|---|
| `login` | `login` | нова група |
| `login` | `login` | та сама група — тепер 2 |
| `view` | `view` | ключ змінився — нова група |
| `login` | `login` | знову нова група, хоча `login` уже траплявся |

Щоб отримати рівно одну групу на ключ, дані спершу **сортують за тим самим ключем**: `groupby(sorted(items, key=k), key=k)`. Група — теж ітератор, і вона «згорає», коли `groupby` переходить до наступної, тому її вміст забирають одразу (`list(group)`).

## Ледачість на практиці

```python
from itertools import islice


def read_ids(path):
    with open(path) as file:
        for line in file:
            yield int(line)


first_ten = list(islice(read_ids("ids.txt"), 10))    # прочитає лише 10 рядків
```

Генератори й `itertools` нічого не обчислюють наперед: кожен елемент з'являється, лише коли його попросили. Так обробляють файли на гігабайти й API з тисячами сторінок.

## Типові помилки

- Обійти ітератор (генератор, `map`, файл) двічі — вдруге порожньо.
- `groupby` без сортування, коли треба одна група на ключ.
- Зберегти `group` з `groupby` «на потім» — вона вже порожня.
- `len(generator)` — у генератора немає довжини; спершу `list(...)` або `sum(1 for _ in gen)`.
- `batched` повертає **кортежі**, а не списки.
- `zip` мовчки обрізає довший список; `zip(a, b, strict=True)` кине помилку, якщо довжини різні.

## Підсумок

- Iterable дає ітератор (`iter`), ітератор видає елементи (`next`) і закінчується `StopIteration`.
- Ітератор одноразовий; iterable з `__iter__`-генератором можна обходити багато разів.
- `yield from` віддає всі елементи іншого iterable.
- `itertools`: `islice`, `chain`, `batched`, `pairwise`, `groupby`, `accumulate`, `count`.
- `groupby` групує сусідні елементи: для «одна група на ключ» спершу відсортуй.
