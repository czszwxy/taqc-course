# JSON і CSV

Тестові дані зручно тримати окремо від коду: користувачі для логіну, набори значень для перевірок, очікувані відповіді API. Два найпоширеніші формати — **JSON** (вкладені структури) і **CSV** (таблиці, які можна відкрити в Excel).

## JSON у файлах

У модулі Python Collections ти працював з `json.loads` / `json.dumps` — вони перетворюють **рядки**. Для файлів є пара без `s`:

```python
import json

with open("settings.json", encoding="utf-8") as f:
    settings = json.load(f)                      # файл → dict
settings["timeout"]                              # 30

with open("results.json", "w", encoding="utf-8") as f:
    json.dump({"suite": "smoke", "статус": "ok"}, f, indent=2, ensure_ascii=False)
```

| Функція | Що приймає | Що повертає |
|---|---|---|
| `json.loads(text)` | рядок | Python-об'єкт |
| `json.load(f)` | відкритий файл | Python-об'єкт |
| `json.dumps(obj)` | Python-об'єкт | рядок |
| `json.dump(obj, f)` | об'єкт і файл | записує у файл |

`indent=2` робить файл читабельним, а `ensure_ascii=False` зберігає кирилицю як є, а не `\u0441\u0442...`.

## CSV

CSV — текстова таблиця: перший рядок — заголовки, далі — рядки даних, значення через кому.

```text
name,price,in_stock
Mouse,450,yes
"Cable, USB-C",150,no
```

Зверни увагу на `"Cable, USB-C"`: значення з комою береться в лапки. Тому `line.split(",")` тут зламається — використовуй модуль `csv`, який знає ці правила.

### Читання: DictReader

```python
import csv

with open("products.csv", newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        print(row["name"], int(row["price"]), row["in_stock"] == "yes")
```

`DictReader` бере назви стовпців із першого рядка, і кожен рядок даних стає словником.

## Розбір: що бачить DictReader

| Рядок файлу | Що повертає DictReader |
|---|---|
| `name,price,in_stock` | — заголовки, з них беруться ключі |
| `Mouse,450,yes` | `{'name': 'Mouse', 'price': '450', 'in_stock': 'yes'}` |
| `"Cable, USB-C",150,no` | `{'name': 'Cable, USB-C', 'price': '150', 'in_stock': 'no'}` |

Усі значення — **рядки**: `'450'`, `'yes'`. Перетворення типів — твоя відповідальність: `int(row["price"])`, `row["in_stock"] == "yes"`.

### Запис: DictWriter

```python
bugs = [{"id": 7, "title": "Cart total wrong", "severity": 3}]

with open("bugs.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["id", "title", "severity"])
    writer.writeheader()
    writer.writerows(bugs)
```

> [!WARNING]
> Відкриваючи файл для CSV, передавай `newline=""`. Модуль `csv` сам керує переносами рядків; без цього параметра на Windows між рядками з'являються порожні рядки.

## CSV з Excel

Excel з українською локаллю часто зберігає CSV з роздільником `;` і невидимим символом BOM на початку файлу:

```python
with open("cases.csv", newline="", encoding="utf-8-sig") as f:   # -sig прибирає BOM
    rows = list(csv.DictReader(f, delimiter=";"))
```

Якщо назва першого стовпця «чомусь» `'\ufeffemail'` замість `'email'` — це BOM.

> [!QA]
> CSV — природний формат для **data-driven** тестів: аналітик чи тестувальник додає рядок у таблицю, і тест автоматично перевіряє новий випадок. У модулі pytest ти перетвориш такі рядки на параметризовані тести.

## Типові помилки

- `json.load(text)` для рядка — `AttributeError`; для рядка — `json.loads`.
- `line.split(",")` замість модуля `csv` — ламається на значеннях з комами в лапках.
- Порівняння `row["price"] == 450` — завжди `False`: значення CSV — рядки.
- Забутий `newline=""` — порожні рядки в CSV на Windows.
- Забутий `writeheader()` — у файлі немає рядка заголовків.

## Підсумок

- `json.load` / `json.dump` — для файлів; `loads` / `dumps` — для рядків; `indent=2`, `ensure_ascii=False`.
- CSV читай модулем `csv`: `DictReader` дає словники з ключами-заголовками.
- Усі значення CSV — рядки: перетворюй типи самостійно.
- Пиши через `DictWriter` + `writeheader()`; файл відкривай з `newline=""` і `encoding="utf-8"`.
- CSV з Excel: `delimiter=";"`, `encoding="utf-8-sig"`.
