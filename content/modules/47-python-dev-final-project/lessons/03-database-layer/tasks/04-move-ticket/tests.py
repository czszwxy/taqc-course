from datetime import date

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from models import Base, Notification, StatusChange, Ticket
from repairs import CUSTOMER, STAFF, RepairError
from solution import move_ticket

TODAY = date(2026, 11, 18)
LATER = date(2026, 11, 20)


@pytest.fixture
def engine():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


def seed(engine, status="received", version=1, estimate_total=None):
    with Session(engine) as session:
        ticket = Ticket(
            customer_email="olena@example.com",
            device="Phone X2",
            problem="Cracked screen",
            priority="normal",
            status=status,
            received_on=TODAY,
            due_on=date(2026, 11, 23),
            version=version,
            estimate_total=estimate_total,
        )
        session.add(ticket)
        session.commit()
        return ticket.id


def saved(engine, ticket_id=1):
    """Стан у базі, яким його побачить наступний запит."""
    with Session(engine) as fresh:
        ticket = fresh.get(Ticket, ticket_id)
        history = [(item.from_status, item.to_status, item.by_role, item.changed_on) for item in ticket.history]
        messages = fresh.scalars(select(Notification)).all()
        return {
            "status": ticket.status,
            "version": ticket.version,
            "estimate_total": ticket.estimate_total,
            "history": history,
            "messages": [(message.ticket_id, message.recipient, message.text, message.status) for message in messages],
        }


def move(engine, *args, **kwargs):
    kwargs.setdefault("today", TODAY)
    with Session(engine) as session:
        ticket = move_ticket(session, *args, **kwargs)
        result = (ticket.id, ticket.status, ticket.version)
    return result


def error_code(engine, *args, **kwargs):
    kwargs.setdefault("today", TODAY)
    with Session(engine) as session:
        with pytest.raises(RepairError) as caught:
            move_ticket(session, *args, **kwargs)
        session.commit()  # той, хто викликає, може зафіксувати свою роботу — від невдалої зміни нічого не має лишитися
    return caught.value.code


def test_moves_and_returns_the_ticket(engine):
    """Повертає заявку з новим статусом і версією + 1."""
    seed(engine)
    assert move(engine, 1, "diagnosing", role=STAFF, version=1) == (1, "diagnosing", 2)


def test_change_is_committed(engine):
    """Сервіс сам робить commit: новий Session бачить статус, версію і запис історії."""
    seed(engine)
    move(engine, 1, "diagnosing", role=STAFF, version=1, today=LATER)
    assert saved(engine) == {
        "status": "diagnosing",
        "version": 2,
        "estimate_total": None,
        "history": [("received", "diagnosing", "staff", LATER)],
        "messages": [],
    }


def test_two_changes_in_a_row(engine):
    seed(engine)
    move(engine, 1, "diagnosing", role=STAFF, version=1)
    move(engine, 1, "cancelled", role=STAFF, version=2)
    state = saved(engine)
    assert (state["status"], state["version"]) == ("cancelled", 3)
    assert [item[1] for item in state["history"]] == ["diagnosing", "cancelled"]


def test_missing_ticket(engine):
    assert error_code(engine, 7, "diagnosing", role=STAFF, version=1) == "not_found"


@pytest.mark.parametrize(
    ("status", "new", "role", "code"),
    [
        ("received", "ready", STAFF, "invalid_transition"),
        ("received", "diagnosing", CUSTOMER, "forbidden"),
        ("waiting_approval", "repairing", STAFF, "forbidden"),
    ],
)
def test_domain_rules_decide(engine, status, new, role, code):
    """Правила переходів — з repairs.change_status; при помилці нічого не змінюється."""
    seed(engine, status=status)
    before = saved(engine)
    assert error_code(engine, 1, new, role=role, version=1) == code
    assert saved(engine) == before


def test_stale_version_is_a_conflict(engine):
    """Клієнт бачив версію 1, а заявку вже змінили (версія 2) → "conflict", і нічого не змінюється."""
    seed(engine, status="diagnosing", version=2)
    before = saved(engine)
    assert error_code(engine, 1, "cancelled", role=STAFF, version=1) == "conflict"
    assert saved(engine) == before


def test_future_version_is_a_conflict_too(engine):
    seed(engine)
    assert error_code(engine, 1, "diagnosing", role=STAFF, version=5) == "conflict"


def test_waiting_approval_needs_an_estimate(engine):
    """У waiting_approval не можна без кошторису: estimate_total=None → "estimate_required"."""
    seed(engine, status="diagnosing")
    before = saved(engine)
    assert error_code(engine, 1, "waiting_approval", role=STAFF, version=1) == "estimate_required"
    assert saved(engine) == before


def test_estimate_is_saved(engine):
    seed(engine, status="diagnosing")
    move(engine, 1, "waiting_approval", role=STAFF, version=1, estimate_total=3300)
    state = saved(engine)
    assert (state["status"], state["estimate_total"]) == ("waiting_approval", 3300)


def test_zero_estimate_counts(engine):
    """Кошторис 0 (гарантія) — це кошторис, а не його відсутність: перевіряй `is None`."""
    seed(engine, status="diagnosing")
    move(engine, 1, "waiting_approval", role=STAFF, version=1, estimate_total=0)
    assert saved(engine)["estimate_total"] == 0


def test_estimate_is_kept_on_later_changes(engine):
    """Наступні зміни не стирають кошторис."""
    seed(engine, status="waiting_approval", estimate_total=900)
    move(engine, 1, "repairing", role=CUSTOMER, version=1)
    assert saved(engine)["estimate_total"] == 900


def test_ready_queues_a_notification(engine):
    """Статус ready → у тій самій транзакції рядок Notification для клієнта."""
    seed(engine, status="repairing")
    move(engine, 1, "ready", role=STAFF, version=1)
    assert saved(engine)["messages"] == [
        (1, "olena@example.com", "Your Phone X2 is ready for pickup (ticket #1).", "pending"),
    ]


@pytest.mark.parametrize(("status", "new"), [("received", "diagnosing"), ("ready", "closed")])
def test_other_statuses_send_nothing(engine, status, new):
    seed(engine, status=status)
    move(engine, 1, new, role=STAFF, version=1)
    assert saved(engine)["messages"] == []


def test_conflict_queues_no_notification(engine):
    """Невдала зміна не лишає ні запису історії, ні повідомлення — навіть якщо той, хто викликав, потім зробить commit."""
    seed(engine, status="repairing", version=3)
    assert error_code(engine, 1, "ready", role=STAFF, version=2) == "conflict"
    state = saved(engine)
    assert (state["history"], state["messages"]) == ([], [])
