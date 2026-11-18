from datetime import date

import pytest
from sqlalchemy import create_engine, func, inspect, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from solution import Base, Notification, StatusChange, Ticket

TODAY = date(2026, 11, 18)


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


def make_ticket(**changes):
    fields = {
        "customer_email": "olena@example.com",
        "device": "Phone X2",
        "problem": "Cracked screen",
        "priority": "normal",
        "received_on": TODAY,
        "due_on": date(2026, 11, 23),
    }
    fields.update(changes)
    return Ticket(**fields)


def change(status_from, status_to, role="staff"):
    return StatusChange(from_status=status_from, to_status=status_to, by_role=role, changed_on=TODAY)


def test_tables(engine):
    """Таблиці tickets, status_changes і notifications."""
    assert set(inspect(engine).get_table_names()) == {"tickets", "status_changes", "notifications"}


def test_ticket_columns():
    """Стовпці Ticket — саме ці (назви з умови)."""
    expected = {
        "id", "customer_email", "device", "problem", "priority", "status",
        "received_on", "due_on", "estimate_total", "version",
    }
    assert set(Ticket.__table__.columns.keys()) == expected


def test_ticket_column_types():
    """Довжини рядків з умови, дати — Mapped[date], customer_email з індексом."""
    columns = Ticket.__table__.columns
    assert columns["device"].type.length == 60
    assert columns["problem"].type.length == 500
    assert columns["customer_email"].index is True
    assert columns["received_on"].type.python_type is date
    assert columns["due_on"].type.python_type is date


def test_nullable_columns():
    """Лише estimate_total може бути NULL (кошторису ще немає)."""
    nullable = {column.name for column in Ticket.__table__.columns if column.nullable}
    assert nullable == {"estimate_total"}


def test_defaults(session):
    """Нова заявка: status "received", version 1, estimate_total None, id видає база."""
    ticket = make_ticket()
    session.add(ticket)
    session.flush()
    assert ticket.id == 1
    assert ticket.status == "received"
    assert ticket.version == 1
    assert ticket.estimate_total is None


@pytest.mark.parametrize(
    "changes",
    [{"priority": "asap"}, {"status": "lost"}, {"estimate_total": -1}],
    ids=["priority", "status", "estimate"],
)
def test_check_constraints(session, changes):
    """CheckConstraint: пріоритет і статус лише з дозволених, кошторис не від'ємний."""
    session.add(make_ticket(**changes))
    with pytest.raises(IntegrityError):
        session.flush()


@pytest.mark.parametrize("status", ["received", "diagnosing", "waiting_approval", "repairing", "ready", "closed", "cancelled"])
def test_every_status_is_allowed(session, status):
    """Обмеження статусу має пропускати всі сім статусів."""
    session.add(make_ticket(status=status))
    session.flush()


def test_zero_estimate_is_allowed(session):
    """Гарантійний ремонт коштує 0 — це дозволено."""
    session.add(make_ticket(estimate_total=0))
    session.flush()


def test_status_change_columns():
    expected = {"id", "ticket_id", "from_status", "to_status", "by_role", "changed_on"}
    assert set(StatusChange.__table__.columns.keys()) == expected
    foreign_key = next(iter(StatusChange.__table__.columns["ticket_id"].foreign_keys))
    assert foreign_key.target_fullname == "tickets.id"


def test_history_has_an_order():
    """relationship(..., order_by="StatusChange.id"): без order_by порядок історії вирішує база, а не код."""
    order = Ticket.history.property.order_by
    assert order, "у Ticket.history немає order_by"
    assert [str(column) for column in order] == ["status_changes.id"]


def test_history_is_loaded_in_order(engine, session):
    """Ticket.history — список змін у порядку id."""
    ticket = make_ticket()
    session.add(ticket)
    session.flush()
    session.add_all([
        StatusChange(ticket_id=ticket.id, from_status="received", to_status="diagnosing", by_role="staff", changed_on=TODAY),
        StatusChange(ticket_id=ticket.id, from_status="diagnosing", to_status="cancelled", by_role="staff", changed_on=TODAY),
    ])
    session.commit()
    session.close()
    with Session(engine) as fresh:
        loaded = fresh.get(Ticket, 1)
        assert [item.to_status for item in loaded.history] == ["diagnosing", "cancelled"]


def test_back_populates(session):
    """StatusChange.ticket і Ticket.history пов'язані через back_populates."""
    ticket = make_ticket()
    item = change("received", "diagnosing")
    ticket.history.append(item)
    assert item.ticket is ticket


def test_history_is_saved_with_the_ticket(session):
    """Зміна, додана в ticket.history, зберігається разом із заявкою (cascade)."""
    ticket = make_ticket()
    ticket.history.append(change("received", "diagnosing"))
    session.add(ticket)
    session.flush()
    assert session.scalar(select(func.count()).select_from(StatusChange)) == 1


def test_delete_orphan(session):
    """cascade="all, delete-orphan": прибрана зі списку зміна видаляється з бази."""
    ticket = make_ticket()
    ticket.history.append(change("received", "diagnosing"))
    session.add(ticket)
    session.flush()
    ticket.history.clear()
    session.flush()
    assert session.scalar(select(func.count()).select_from(StatusChange)) == 0


def test_deleting_a_ticket_deletes_its_history(session):
    ticket = make_ticket()
    ticket.history.append(change("received", "diagnosing"))
    session.add(ticket)
    session.flush()
    session.delete(ticket)
    session.flush()
    assert session.scalar(select(func.count()).select_from(StatusChange)) == 0


def test_notification_still_works(session):
    """Готовий клас Notification має лишитися без змін."""
    ticket = make_ticket()
    session.add(ticket)
    session.flush()
    message = Notification(ticket_id=ticket.id, recipient="olena@example.com", text="Ready")
    session.add(message)
    session.flush()
    assert (message.status, message.attempts, message.last_error) == ("pending", 0, None)
