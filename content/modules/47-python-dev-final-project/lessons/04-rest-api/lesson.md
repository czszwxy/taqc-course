# REST API на FastAPI

Усе складне вже написано: правила — у `repairs.py`, запити — у `repository.py`, транзакція — у `services.py`. HTTP-шар лишається **тонким**: прочитати запит, дізнатися, хто питає, викликати нижчі шари і перекласти результат або помилку у відповідь. Якщо в ендпоінті з'являється бізнес-правило, йому, найімовірніше, місце в домені.

> [!IMPORTANT]
> Задачі цього уроку працюють **на комп'ютері** в лабораторії Python (`npm run lab:python-setup` — один раз). На сайті з телефона вони покажуть «This task runs on your computer».

## Ендпоінти проєкту

| Метод і шлях | Хто | Відповідь |
|---|---|---|
| `POST /tickets` | customer | `201` + `Location`, заявка |
| `GET /tickets?status=&overdue=&limit=&offset=` | обидві ролі | `{"items": [...], "total": n}` |
| `GET /tickets/{id}` | обидві ролі | заявка |
| `POST /tickets/{id}/status` | за таблицею переходів | заявка |
| `POST /tickets/{id}/estimate` | staff | заявка в `waiting_approval` |
| `GET /tickets/{id}/history` | обидві ролі | список змін |

## Залежності: сесія, дата, користувач

Усе, що приходить «ззовні» — з'єднання з базою, сьогоднішня дата, користувач, — отримуй через `Depends`. У тестах їх підмінюють через `app.dependency_overrides`:

```python
def get_session():
    with Session(engine) as session:
        yield session


def get_today():
    return date.today()


@app.get("/loans/{loan_id}")
def get_loan(
    loan_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    today: date = Depends(get_today),
):
    ...
```

Користувач береться з токена в `auth.py` (готовий файл проєкту): `Authorization: Bearer olena-token` → `User("olena@example.com", "customer")`. Без токена або з невідомим — `401`. Справжній сервіс перевіряв би JWT, як у модулі «REST APIs with FastAPI»; для фінального проєкту важлива **роль**, а не спосіб входу.

## Чужі дані: 404, а не 403

Клієнт, який відкриває чужу заявку, отримує `404 not_found`, а не `403`. Відповідь `403` підтвердила б, що заявка з таким `id` існує, і перебором `id` можна було б дізнатися, скільки ремонтів у сервісі. Тому перевірка «чи бачить цей користувач заявку» — окрема функція, яку викликає **кожен** ендпоінт з `{id}`, включно з тими, що змінюють заявку:

```python
def visible_loan(session, loan_id, user):
    loan = session.get(Loan, loan_id)
    if loan is None or (user.role == READER and loan.reader_email != user.email):
        raise LoanError("not_found")
    return loan
```

`403 forbidden` лишається для іншого випадку: заявку ти бачиш, але ця дія не для твоєї ролі.

## Доменні помилки → HTTP в одному місці

Домен і сервіс кидають `RepairError` з кодом. Замість `try` / `except` у кожному ендпоінті — **один** обробник і словник:

```python
ERROR_STATUS = {"not_found": 404, "forbidden": 403, "conflict": 409}


@app.exception_handler(LoanError)
def loan_error(request: Request, error: LoanError):
    return JSONResponse(status_code=ERROR_STATUS[error.code], content={"detail": {"error": error.code}})
```

Формат `{"detail": {"error": "<код>"}}` однаковий для всіх помилок, тому фронтенд показує повідомлення за кодом, не розбираючи текст. Новий код помилки в домені — один новий рядок у словнику.

> [!WARNING]
> Забутий код у `ERROR_STATUS` дасть `KeyError` в обробнику, тобто `500`. Коли додаєш доменну помилку, одразу додай її в словник і напиши тест на відповідь.

## Схеми: що приймаємо, що віддаємо

```python
class LoanIn(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=200)
    kind: Literal["book", "magazine"] = "book"
```

- `str_strip_whitespace=True` обрізає пробіли **до** перевірки довжини: `"   "` стане `""` і не пройде `min_length`.
- `extra="forbid"` відхиляє зайві поля з `422`. Клієнт не зможе підкласти `reader_email` чужої людини: email береться з токена, а не з тіла.
- `Literal[...]` — список дозволених значень; FastAPI сам відповість `422` на інше.

Відповідь може містити поля, яких **немає в таблиці**, бо вони залежать від того, хто питає, і від сьогоднішньої дати. У проєкті це `overdue` (з `is_overdue(due_on, today, status)`) і `actions` (з `next_statuses(status, user.role)`). Тому заявку перетворює на відповідь функція `to_out(ticket, user, today)`, а не автоматичне читання атрибутів.

## Версія в тілі запиту

Для оптимістичного блокування клієнт надсилає версію, яку бачив:

```text
POST /tickets/1/status
{"status": "ready", "version": 4}
```

Сервіс порівнює її в `UPDATE … WHERE version = ?`, а API перекладає `conflict` у `409`. Інтерфейс на `409` перечитує заявку й показує свіжий стан. Інший поширений спосіб — заголовки `ETag` і `If-Match`, ідея та сама.

## Створення: 201 і Location

```python
@app.post("/loans", status_code=201, response_model=LoanOut)
def create_loan(body: LoanIn, response: Response, ...):
    ...
    response.headers["Location"] = f"/loans/{loan.id}"
```

`201 Created` і `Location` кажуть клієнту, що ресурс створено і де він живе. `id` з'являється після `flush` (репозиторій), а `commit` робить ендпоінт — це і є сценарій створення.

> [!QA]
> Тест API перевіряє переклад, а не правила: правила вже покрито тестами домену. Для API важливі коди статусів, формат помилок, доступ до чужих даних і що зміна справді збережена (новий `Session` після запиту).

## Підсумок

- Ендпоінт тонкий: залежності → виклики нижчих шарів → `to_out` → відповідь.
- Сесія, дата й користувач — через `Depends`, тести підмінюють їх через `dependency_overrides`.
- Чужа заявка — `404` у **кожному** ендпоінті з `{id}`; `403` — коли бачиш, але не твоя дія.
- Один обробник `RepairError` і словник `ERROR_STATUS`; формат `{"detail": {"error": код}}`.
- `extra="forbid"`, `str_strip_whitespace`, `Literal`, межі `Query` — валідація до коду.
- Версія в тілі → `409 conflict`; створення → `201` + `Location`.
