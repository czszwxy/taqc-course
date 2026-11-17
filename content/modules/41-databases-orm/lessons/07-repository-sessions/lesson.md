# Репозиторії, сесії й тести

Поки код з базою — це п'ять функцій, `session` можна передавати як завгодно. У застосунку з десятками ендпоінтів потрібні правила: **хто створює сесію, хто робить commit і де живуть запити**. Інакше з'являються незбережені зміни, «половинчасті» операції й тести, яким потрібна справжня база там, де вистачило б підробки.

Приклад уроку — служба підтримки: `Ticket` (звернення) зі статусом і пріоритетом.

## Скільки живе Session

| Об'єкт | Скільки живе | Скільки їх |
|---|---|---|
| Engine | увесь час роботи застосунку | один |
| Session | одна одиниця роботи: HTTP-запит, CLI-команда, задача з черги | по одній на кожну |

```python
from sqlalchemy.orm import sessionmaker

engine = create_engine("sqlite:///support.db")
SessionLocal = sessionmaker(engine)            # фабрика сесій з потрібними налаштуваннями

def close_ticket(ticket_id):
    with SessionLocal() as session, session.begin():   # begin(): commit наприкінці або rollback при винятку
        ticket = session.get(Ticket, ticket_id)
        ticket.status = "closed"
```

`session.begin()` як контекст робить для сесії те саме, що `with conn:` для sqlite3: фіксує, якщо все добре, і відкочує, якщо вилетів виняток.

Чого **не** робити: одна глобальна сесія на весь застосунок (її стан «протікає» між запитами, і вона не потокобезпечна); новий Engine у кожній функції (кожен — свій пул з'єднань).

## Репозиторій — усі запити в одному місці

```python
class TicketRepository:
    def __init__(self, session):
        self.session = session

    def add(self, title, priority):
        ticket = Ticket(title=title, priority=priority)
        self.session.add(ticket)
        self.session.flush()                 # отримати id, не фіксуючи транзакцію
        return ticket

    def open_by_priority(self, priority):
        stmt = select(Ticket).where(Ticket.status == "open", Ticket.priority == priority).order_by(Ticket.id)
        return self.session.scalars(stmt).all()
```

Репозиторій знає, **як** знайти й зберегти дані. Він **не** вирішує, коли завершується операція, тому не робить `commit()` — інакше дві зміни одного сценарію опиняться в різних транзакціях.

## Сервіс — бізнес-правила і commit

```python
class SupportService:
    def __init__(self, session):
        self.session = session
        self.tickets = TicketRepository(session)

    def escalate(self, ticket_id):
        ticket = self.tickets.get(ticket_id)
        if ticket.status != "open":
            raise ValueError("only open tickets can be escalated")
        ticket.priority = "high"
        self.session.commit()                 # один сценарій — один commit
```

| Шар | Знає про | Робить commit? |
|---|---|---|
| API / CLI | HTTP, аргументи | ні — створює сесію і віддає її далі |
| Сервіс | бізнес-правила | **так**, в кінці сценарію |
| Репозиторій | запити, моделі | ні, лише `add` / `flush` / `select` |

## Пастка: об'єкт після закриття сесії

```python
with SessionLocal() as session:
    ticket = session.get(Ticket, 1)
print(ticket.comments)      # DetachedInstanceError: сесії вже немає, лінивий зв'язок не завантажити
```

Рішення: потрібне завантажити всередині сесії (`selectinload`) або перетворити на прості дані (dict, Pydantic-модель) до закриття. `sessionmaker(engine, expire_on_commit=False)` залишає атрибути після commit доступними — так часто роблять у вебзастосунках, що повертають об'єкт у відповіді після збереження.

## Тести з базою в пам'яті

```python
@pytest.fixture
def engine():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()

@pytest.fixture
def session(engine):
    with Session(engine) as session:
        yield session
```

Кожен тест отримує нову порожню базу. Щоб перевірити, що зміни **збережені**, тест закриває сесію і читає дані новою: незафіксоване при закритті відкочується.

| Що тестуємо | Чим |
|---|---|
| Репозиторій (запити) | справжня SQLite у пам'яті |
| Сервіс (правила) | SQLite у пам'яті або фейковий репозиторій у пам'яті |
| Увесь застосунок | база як у продакшені (часто PostgreSQL у Docker у CI) |

## Типові помилки

- `commit()` у кожному методі репозиторію — сценарій з двох кроків перестає бути атомарним.
- Сесія на весь застосунок або на потік — незрозуміло, що в ній «висить».
- Повернули ORM-об'єкт із закритої сесії й чіпають лінивий зв'язок.
- Тести, що залежать один від одного через спільну базу.

> [!QA]
> Щоб тест ловив «забутий commit», перевіряй результат **новою сесією** після закриття старої. Тест, що читає тією самою сесією, бачить незбережені зміни і пройде навіть з багом.

## Підсумок
- Engine — один; Session — на кожну одиницю роботи; `sessionmaker` — фабрика, `session.begin()` — commit / rollback.
- Репозиторій інкапсулює запити й не робить commit; сервіс тримає правила й робить commit в кінці сценарію.
- Після закриття сесії лінивий зв'язок не завантажити — вантаж заздалегідь або віддавай прості дані.
- Тести: свіжа SQLite у пам'яті на кожен тест; збереження перевіряй новою сесією.
