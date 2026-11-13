# Файли і pathlib

Тестувальник постійно працює з файлами: тестові дані в JSON і CSV, логи сервера, скріншоти упалих тестів, звіти прогону. У цьому уроці — як безпечно читати й записувати файли і як працювати зі шляхами.

## open і with

```python
with open("notes.txt", "w", encoding="utf-8") as f:
    f.write("smoke: 3 passed\n")
    f.write("login: 1 failed\n")
```

`with` гарантує, що файл буде **закрито** наприкінці блоку — навіть якщо всередині сталася помилка (як `finally` з уроку про винятки).

| Режим | Що робить |
|---|---|
| `"r"` | читати (за замовчуванням); файлу немає — `FileNotFoundError` |
| `"w"` | записати; існуючий вміст **стирається**, файл створюється, якщо його немає |
| `"a"` | дописати в кінець; файл створюється, якщо його немає |
| `"rb"` / `"wb"` | бінарний режим — для картинок, PDF |

## Розбір: життя файлу в блоці with

| Момент | Що відбувається |
|---|---|
| `with open(...) as f:` | файл відкрито, `f` — об'єкт файлу |
| `f.write(...)` | текст іде в буфер (може ще не бути на диску) |
| кінець блоку **або** виняток | файл закривається, буфер записується на диск |
| після блоку | `f.write(...)` дасть `ValueError: I/O operation on closed file` |

> [!WARNING]
> Завжди вказуй `encoding="utf-8"`. Кодування за замовчуванням залежить від системи: на Windows воно може бути не UTF-8, і кирилиця перетвориться на «кракозябри» або `UnicodeDecodeError`. Тест, що проходить у колеги на Mac і падає у тебе на Windows, — часто саме це.

## Читання

```python
with open("server.log", encoding="utf-8") as f:
    text = f.read()               # увесь файл одним рядком

with open("server.log", encoding="utf-8") as f:
    for line in f:                # рядок за рядком — ліниво, як генератор
        if "Total:" in line:
            print(line.strip())   # кожен рядок закінчується "\n" — strip() прибирає
```

Перебір `for line in f` не завантажує весь файл у пам'ять — так читають і величезні логи.

## pathlib.Path

Модуль `pathlib` представляє шлях як об'єкт з корисними методами:

```python
from pathlib import Path

reports = Path("reports") / "2026-11-13"       # / з'єднує частини шляху
reports.mkdir(parents=True, exist_ok=True)     # створити разом з батьківськими папками
summary = reports / "summary.txt"
summary.write_text("all green\n", encoding="utf-8")
summary.read_text(encoding="utf-8")            # 'all green\n'

summary.exists()        # True
summary.name            # 'summary.txt'
summary.stem            # 'summary'
summary.suffix          # '.txt'
summary.parent          # Path('reports/2026-11-13')
```

`/` між шляхами сам ставить правильний роздільник для Windows (`\`) чи Linux / macOS (`/`).

### Пошук файлів

```python
list(Path("test-results").glob("*.png"))      # PNG у самій папці
list(Path("test-results").rglob("*.png"))     # PNG у папці та всіх підпапках
```

## Шляхи до тестових даних

Відносний шлях `"data/users.json"` рахується від **поточної робочої папки** — а вона різна, коли тести запускають з IDE, з терміналу чи в CI. Надійно — від файлу самого тесту:

```python
DATA_DIR = Path(__file__).parent / "data"
users_file = DATA_DIR / "users.json"
```

> [!QA]
> «На моєму комп'ютері працює, а в CI — FileNotFoundError» — класична проблема відносних шляхів. `Path(__file__).parent` робить шлях до тестових даних незалежним від того, звідки запущено тести.

## Файли в тестах: tmp_path

Тести не повинні смітити в проєкті і заважати один одному. У pytest є вбудована фікстура `tmp_path` — нова порожня папка для кожного тесту:

```python
def test_writes_report(tmp_path):
    report = tmp_path / "report.txt"
    report.write_text("ok\n", encoding="utf-8")
    assert report.read_text(encoding="utf-8") == "ok\n"
```

Саме так перевіряються задачі цього уроку: тести створюють файли у `tmp_path` і передають шляхи твоїм функціям.

## Типові помилки

- Забутий `encoding="utf-8"` — кирилиця ламається на іншій ОС.
- Режим `"w"` замість `"a"` — попередній вміст стерто.
- Повторне читання тим самим об'єктом файлу: після `f.read()` другий `f.read()` поверне `""` — курсор уже в кінці.
- Склеювання шляхів рядками (`"reports" + "/" + name`) — використовуй `Path(...) / name`.
- Рядки з файлу закінчуються `"\n"`: без `strip()` порівняння `line == "PASSED"` не спрацює.

## Підсумок

- `with open(шлях, режим, encoding="utf-8") as f:` — файл закриється сам, навіть при помилці.
- `"r"` — читати, `"w"` — перезаписати, `"a"` — дописати.
- `for line in f` читає ліниво; рядки містять `"\n"`.
- `Path`: `/` для шляхів, `mkdir(parents=True, exist_ok=True)`, `read_text` / `write_text`, `glob` / `rglob`, `name` / `stem` / `suffix` / `parent`.
- Тестові дані — від `Path(__file__).parent`; у тестах — тимчасова папка `tmp_path`.
