import re
from datetime import date, timedelta

import pytest
from sqlalchemy import create_engine, event, func, select
from sqlalchemy.orm import Session

from models import Base, Ticket
from solution import TicketRepository

TODAY = date(2026, 11, 18)
OLENA = "olena@example.com"
TARAS = "taras@example.com"


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


@pytest.fixture
def repo(session):
    return TicketRepository(session)


def make_ticket(customer=OLENA, status="received", due_in=3, device="Phone X2"):
    return Ticket(
        customer_email=customer,
        device=device,
        problem="Does not charge",
        priority="normal",
        status=status,
        received_on=TODAY,
        due_on=TODAY + timedelta(days=due_in),
    )


def seed(engine, tickets):
    with Session(engine) as session:
        session.add_all(tickets)
        session.commit()


def ids(tickets):
    return [ticket.id for ticket in tickets]


def test_add_assigns_an_id(repo):
    """add робить flush — id з'являється ще до commit, і add повертає ту саму заявку."""
    ticket = make_ticket()
    assert repo.add(ticket) is ticket
    assert ticket.id == 1


def test_add_does_not_commit(repo, session):
    """Репозиторій не фіксує транзакцію: після rollback заявки немає."""
    repo.add(make_ticket())
    session.rollback()
    assert session.scalar(select(func.count()).select_from(Ticket)) == 0


def test_get(repo):
    ticket = repo.add(make_ticket())
    assert repo.get(ticket.id) is ticket


def test_get_missing_returns_none(repo):
    """Немає заявки → None (рішення «404 чи помилка» приймає той, хто викликає)."""
    assert repo.get(42) is None


def test_search_everything(engine, repo):
    """Без фільтрів — усі заявки; повертає (список, total)."""
    seed(engine, [make_ticket(), make_ticket(customer=TARAS)])
    items, total = repo.search()
    assert ids(items) == [1, 2]
    assert total == 2


def test_search_returns_a_list(engine, repo):
    seed(engine, [make_ticket()])
    items, _ = repo.search()
    assert isinstance(items, list)


def test_order_by_due_date_then_id(engine, repo):
    """Спершу ті, в кого дедлайн раніше; однаковий дедлайн — за id."""
    seed(engine, [make_ticket(due_in=5), make_ticket(due_in=1), make_ticket(due_in=5), make_ticket(due_in=2)])
    items, _ = repo.search()
    assert ids(items) == [2, 4, 1, 3]


def test_filter_by_customer(engine, repo):
    seed(engine, [make_ticket(), make_ticket(customer=TARAS), make_ticket()])
    items, total = repo.search(customer=OLENA)
    assert ids(items) == [1, 3]
    assert total == 2


def test_filter_by_status(engine, repo):
    seed(engine, [make_ticket(), make_ticket(status="ready"), make_ticket(status="ready", customer=TARAS)])
    items, total = repo.search(status="ready")
    assert ids(items) == [2, 3]
    assert total == 2


def test_filters_combine(engine, repo):
    """Кілька фільтрів — усі одночасно (AND)."""
    seed(engine, [make_ticket(status="ready"), make_ticket(status="ready", customer=TARAS), make_ticket(customer=TARAS)])
    items, total = repo.search(customer=TARAS, status="ready")
    assert ids(items) == [2]
    assert total == 1


def test_overdue(engine, repo):
    """overdue_on=день: due_on раніше за цей день і статус із CLOCK_RUNNING."""
    seed(engine, [
        make_ticket(due_in=-1),                              # 1: прострочено
        make_ticket(due_in=0),                               # 2: дедлайн сьогодні — ще вчасно
        make_ticket(due_in=-3, status="repairing"),          # 3: прострочено
        make_ticket(due_in=-3, status="waiting_approval"),   # 4: годинник стоїть
        make_ticket(due_in=-3, status="ready"),              # 5: уже готово
        make_ticket(due_in=2),                               # 6: ще є час
    ])
    items, total = repo.search(overdue_on=TODAY)
    assert ids(items) == [3, 1]
    assert total == 2


def test_overdue_with_customer(engine, repo):
    seed(engine, [make_ticket(due_in=-1), make_ticket(due_in=-1, customer=TARAS)])
    items, total = repo.search(customer=TARAS, overdue_on=TODAY)
    assert ids(items) == [2]
    assert total == 1


def test_limit_and_offset(engine, repo):
    """Сторінка: limit і offset після сортування; total — скільки всього, а не на сторінці."""
    seed(engine, [make_ticket(due_in=day) for day in range(7)])
    items, total = repo.search(limit=3, offset=3)
    assert ids(items) == [4, 5, 6]
    assert total == 7


def test_offset_past_the_end(engine, repo):
    seed(engine, [make_ticket(), make_ticket()])
    items, total = repo.search(offset=10)
    assert items == []
    assert total == 2


def test_default_page_size(engine, repo):
    seed(engine, [make_ticket() for _ in range(25)])
    items, total = repo.search()
    assert len(items) == 20
    assert total == 25


def test_total_is_counted_by_the_database(engine):
    """total рахує база (SELECT count(*)), а не len() усіх рядків: з бази завантажено лише limit заявок."""
    seed(engine, [make_ticket() for _ in range(30)])
    loaded = []

    def on_load(target, context):
        loaded.append(target.id)

    event.listen(Ticket, "load", on_load)
    try:
        with Session(engine) as fresh:
            items, total = TicketRepository(fresh).search(limit=5)
    finally:
        event.remove(Ticket, "load", on_load)
    assert total == 30
    assert len(loaded) == 5, f"з бази завантажено {len(loaded)} заявок замість 5 — total рахує len() усіх рядків?"


def test_search_sends_two_queries(engine):
    """Сторінка й total — рівно два запити: SELECT заявок з LIMIT і SELECT count."""
    seed(engine, [make_ticket() for _ in range(3)])
    statements = []

    def remember(conn, cursor, sql, *args):
        statements.append(sql)

    event.listen(engine, "before_cursor_execute", remember)
    with Session(engine) as fresh:
        TicketRepository(fresh).search(customer=OLENA, limit=2)
    assert len(statements) == 2, f"запитів: {len(statements)}"
    assert any("count(" in sql.lower() for sql in statements), "total має рахувати база: func.count()"


def test_page_order_is_complete(engine):
    """Сортування для сторінок повне: ORDER BY due_on, потім id — інакше заявки з однаковим дедлайном «стрибають» між сторінками."""
    seed(engine, [make_ticket(), make_ticket()])
    statements = []

    def remember(conn, cursor, sql, *args):
        statements.append(sql)

    event.listen(engine, "before_cursor_execute", remember)
    with Session(engine) as fresh:
        TicketRepository(fresh).search(limit=2)
    page = [sql for sql in statements if "LIMIT" in sql.upper()]
    assert page, "немає запиту сторінки з LIMIT"
    assert re.search(r"ORDER BY tickets\.due_on( ASC)?, tickets\.id( ASC)?", page[0]), page[0]
