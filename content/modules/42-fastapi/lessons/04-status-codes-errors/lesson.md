# Коди статусу і помилки

Код статусу — перше, що читає клієнт. Фронтенд вирішує за ним, показати «Готово!», форму з помилками чи «Спробуйте пізніше». Мобільний застосунок за `401` відправить людину на вхід, а за `503` — повторить запит. Якщо API на все відповідає `200`, кожному клієнту доведеться розбирати текст помилки — і хтось обов'язково помилиться.

## Які коди потрібні бекенд-розробнику

| Код | Назва | Коли повертати |
|---|---|---|
| `200` | OK | успішне читання чи зміна, є тіло відповіді |
| `201` | Created | `POST` створив новий ресурс |
| `204` | No Content | успішно, але тіла немає (часто — `DELETE`) |
| `400` | Bad Request | запит не можна виконати з бізнес-причини (прострочений купон) |
| `401` | Unauthorized | немає або невалідні облікові дані (токен) |
| `403` | Forbidden | хто ти — відомо, але це тобі не дозволено |
| `404` | Not Found | немає маршруту або ресурсу з таким id |
| `409` | Conflict | суперечить поточному стану: дубль email, книжка вже видана, мало товару |
| `422` | Unprocessable Content | тіло чи параметри не пройшли перевірку (FastAPI робить сам) |
| `500` | Internal Server Error | помилка в коді сервера — клієнт тут не винен |

Межа між `400`, `409` і `422` у різних командах трохи різна. У цьому курсі домовимось так: **`422` — формат** (його повертає FastAPI), **`409` — конфлікт зі станом** даних, **`400` — інше «так не можна»**. Головне — одна й та сама ситуація завжди отримує один і той самий код.

Замість чисел можна писати константи — так код читається без таблиці:

```python
from fastapi import status

status.HTTP_201_CREATED      # 201
status.HTTP_404_NOT_FOUND    # 404
status.HTTP_409_CONFLICT     # 409
```

## HTTPException

Приклад — бібліотека, що видає книжки:

```python
from fastapi import FastAPI, HTTPException, status

app = FastAPI()
LOANS: dict[int, str] = {}       # book_id → хто взяв

@app.post("/books/{book_id}/loan", status_code=status.HTTP_201_CREATED)
def loan_book(book_id: int, reader: str):
    if book_id not in BOOKS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    if book_id in LOANS:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Book {book_id} is already on loan")
    LOANS[book_id] = reader
    return {"book_id": book_id, "reader": reader}

@app.delete("/books/{book_id}/loan", status_code=status.HTTP_204_NO_CONTENT)
def return_book(book_id: int):
    if LOANS.pop(book_id, None) is None:
        raise HTTPException(status_code=404, detail="This book is not on loan")
```

- `raise` перериває функцію одразу — далі нічого не виконується.
- `detail` — рядок або будь-який JSON (`{"code": "on_loan", "book_id": 7}`); клієнт отримає `{"detail": ...}`.
- `headers={"Retry-After": "60"}` додає заголовки до відповіді з помилкою.
- Для `204` функція нічого не повертає (`None`), і тіло відповіді порожнє.

## Доменні винятки і обробники

Коли логіка росте, її виносять у **сервіс** — звичайні Python-функції без HTTP. Сервіс не знає про коди статусу, він піднімає **доменні винятки**:

```python
# library.py — сервіс
class LibraryError(Exception):
    code = "library_error"

class BookNotFound(LibraryError):
    code = "book_not_found"

class AlreadyOnLoan(LibraryError):
    code = "already_on_loan"

def loan(book_id: int, reader: str) -> dict:
    if book_id not in BOOKS:
        raise BookNotFound(f"Book {book_id} not found")
    ...
```

А перетворення «виняток → HTTP-відповідь» описують один раз, в обробнику:

```python
from fastapi import Request
from fastapi.responses import JSONResponse

STATUS_BY_ERROR = {BookNotFound: 404, AlreadyOnLoan: 409}

@app.exception_handler(LibraryError)
async def library_error(request: Request, exc: LibraryError):
    return JSONResponse(
        status_code=STATUS_BY_ERROR.get(type(exc), 400),
        content={"error": exc.code, "message": str(exc)},
    )

@app.post("/books/{book_id}/loan", status_code=201)
def loan_book(book_id: int, reader: str):
    return library.loan(book_id, reader)      # жодного try/except у ендпоінті
```

Обробник ловить виняток класу `LibraryError` **і всіх його нащадків** у будь-якому ендпоінті. Що це дає:

- ендпоінти короткі — лише виклик сервісу;
- сервіс можна використати в CLI-скрипті чи фоновій задачі, де HTTP немає;
- усі помилки мають **єдиний формат** `{"error": ..., "message": ...}` — клієнт розбирає їх одним кодом.

> [!NOTE]
> У документації FastAPI обробники винятків зазвичай пишуть як `async def` — так і тут. Звичайний `def` теж спрацює (Starlette виконає його в окремому потоці). Самі ендпоінти лишаються звичайними `def`.

## Непередбачені помилки: 500

Якщо в коді трапився `KeyError`, якого ніхто не ловить, клієнт отримає `500 Internal Server Error` — без деталей. Так і має бути: трейсбек показав би шляхи до файлів, назви таблиць, інколи й дані. Деталі йдуть у **логи** сервера (модуль про logging), а клієнту — коротке повідомлення.

Можна задати й власну відповідь для всього непередбаченого:

```python
import logging

logger = logging.getLogger(__name__)

@app.exception_handler(Exception)
async def unexpected(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(status_code=500, content={"error": "internal_error", "message": "Something went wrong"})
```

> [!WARNING]
> `TestClient` за замовчуванням **перекидає** необроблений виняток прямо в тест (тест падає з `KeyError`) — так легше знайти баг. Щоб побачити саму відповідь `500`, створи клієнт так: `TestClient(app, raise_server_exceptions=False)`.

## Типові помилки

| Помилка | Наслідок |
|---|---|
| `return {"error": "not found"}` замість `raise HTTPException(404)` | клієнт бачить `200` і думає, що все гаразд |
| `200` після створення | клієнт не відрізняє створення від читання; правильно `201` |
| `404` на дубль email | плутає клієнта: ресурсу «не існує», хоча він уже є — це `409` |
| `try: ... except Exception: return 400` у кожному ендпоінті | ховає справжні баги під «поганий запит» |
| Трейсбек у відповіді 500 | витік внутрішніх деталей |

> [!QA]
> Для кожного ендпоінта є щонайменше два тести: «щасливий шлях» і кожна помилка зі своїм кодом **і** тілом. Перевіряй не лише `status_code`, а й формат `{"error", "message"}` — фронтенд зламається саме на ньому, якщо хтось змінить назву поля.

## Підсумок

- Код статусу — частина контракту: `201` створено, `204` без тіла, `404` немає, `409` конфлікт, `422` формат, `401` / `403` — доступ.
- `raise HTTPException(status_code, detail, headers)` перериває ендпоінт і повертає `{"detail": ...}`.
- Сервіс піднімає доменні винятки, `@app.exception_handler(Base)` перетворює їх на JSON з одним форматом.
- `500` не показує деталей; `TestClient(app, raise_server_exceptions=False)` — щоб побачити її в тесті.
