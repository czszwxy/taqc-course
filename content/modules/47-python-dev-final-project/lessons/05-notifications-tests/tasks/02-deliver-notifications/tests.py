from datetime import date

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from models import Base, Notification, Ticket
from solution import deliver_pending

TODAY = date(2026, 11, 18)


@pytest.fixture
def engine(tmp_path):
    # Файлова база: окреме з'єднання бачить лише зафіксоване (commit).
    engine = create_engine(f"sqlite:///{tmp_path / 'repairs.db'}")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        session.add(Ticket(
            customer_email="olena@example.com", device="Phone X2", problem="Cracked screen",
            priority="normal", received_on=TODAY, due_on=TODAY,
        ))
        session.commit()
    yield engine
    engine.dispose()


def queue(engine, *messages):
    with Session(engine) as session:
        for recipient, text, *rest in messages:
            fields = {"status": rest[0]} if rest else {}
            session.add(Notification(ticket_id=1, recipient=recipient, text=text, **fields))
        session.commit()


def rows(engine):
    with Session(engine) as fresh:
        return [
            (message.recipient, message.status, message.attempts, message.last_error)
            for message in fresh.scalars(select(Notification).order_by(Notification.id))
        ]


class Sender:
    """Фейковий поштовий сервіс: записує виклики; адреси з fail_for «падають»."""

    def __init__(self, fail_for=()):
        self.calls = []
        self.fail_for = set(fail_for)

    def __call__(self, recipient, text):
        self.calls.append((recipient, text))
        if recipient in self.fail_for:
            raise ConnectionError(f"SMTP timeout for {recipient}")


def deliver(engine, send, **kwargs):
    with Session(engine) as session:
        return deliver_pending(session, send, **kwargs)


def test_sends_pending_messages(engine):
    """Кожне pending-повідомлення — один виклик send(recipient, text), у порядку id."""
    queue(engine, ("a@example.com", "First"), ("b@example.com", "Second"))
    send = Sender()
    deliver(engine, send)
    assert send.calls == [("a@example.com", "First"), ("b@example.com", "Second")]


def test_marks_sent(engine):
    """Успіх: status "sent", attempts 1 — і це зафіксовано в базі."""
    queue(engine, ("a@example.com", "First"))
    deliver(engine, Sender())
    assert rows(engine) == [("a@example.com", "sent", 1, None)]


def test_report(engine):
    """Повертає звіт {"sent", "retry", "failed"} — скільки повідомлень куди потрапило."""
    queue(engine, ("a@example.com", "A"), ("down@example.com", "B"), ("c@example.com", "C"))
    report = deliver(engine, Sender(fail_for={"down@example.com"}))
    assert report == {"sent": 2, "retry": 1, "failed": 0}


def test_empty_outbox(engine):
    send = Sender()
    assert deliver(engine, send) == {"sent": 0, "retry": 0, "failed": 0}
    assert send.calls == []


def test_only_pending_are_sent(engine):
    """Уже надіслані й остаточно невдалі не надсилаються вдруге."""
    queue(engine, ("a@example.com", "Old", "sent"), ("b@example.com", "Broken", "failed"), ("c@example.com", "New"))
    send = Sender()
    deliver(engine, send)
    assert send.calls == [("c@example.com", "New")]


def test_second_run_sends_nothing_new(engine):
    queue(engine, ("a@example.com", "First"))
    deliver(engine, Sender())
    send = Sender()
    deliver(engine, send)
    assert send.calls == []


def test_failure_does_not_stop_the_others(engine):
    """Помилка одного send — не причина зупиняти чергу: наступні повідомлення теж ідуть."""
    queue(engine, ("down@example.com", "A"), ("b@example.com", "B"))
    deliver(engine, Sender(fail_for={"down@example.com"}))
    assert rows(engine) == [
        ("down@example.com", "pending", 1, "SMTP timeout for down@example.com"),
        ("b@example.com", "sent", 1, None),
    ]


def test_retry_until_max_attempts(engine):
    """Кожна спроба +1 до attempts; на max_attempts-й невдачі — status "failed"."""
    queue(engine, ("down@example.com", "A"))
    send = Sender(fail_for={"down@example.com"})
    reports = [deliver(engine, send, max_attempts=3) for _ in range(4)]
    assert [report["failed"] for report in reports] == [0, 0, 1, 0]
    assert rows(engine) == [("down@example.com", "failed", 3, "SMTP timeout for down@example.com")]
    assert len(send.calls) == 3


def test_default_max_attempts_is_three(engine):
    queue(engine, ("down@example.com", "A"))
    send = Sender(fail_for={"down@example.com"})
    for _ in range(3):
        deliver(engine, send)
    assert rows(engine)[0][1] == "failed"


def test_success_after_a_failure_clears_the_error(engine):
    queue(engine, ("flaky@example.com", "A"))
    deliver(engine, Sender(fail_for={"flaky@example.com"}))
    deliver(engine, Sender())
    assert rows(engine) == [("flaky@example.com", "sent", 2, None)]


def test_commits_after_every_message(engine):
    """Commit після КОЖНОГО повідомлення: якщо процес упаде посередині, надіслане вже позначене й не піде вдруге."""
    queue(engine, ("a@example.com", "A"), ("b@example.com", "B"))
    seen = []

    def send(recipient, text):
        seen.append(rows(engine)[0][1])

    deliver(engine, send)
    assert seen[1] == "sent", "коли надсилалося друге повідомлення, перше ще не було зафіксоване — commit лише в кінці?"


def test_unexpected_errors_are_counted_too(engine):
    """Будь-який Exception з send — це невдала спроба, а не падіння всього процесу."""
    queue(engine, ("a@example.com", "A"))

    def send(recipient, text):
        raise ValueError("bad address")

    assert deliver(engine, send) == {"sent": 0, "retry": 1, "failed": 0}
    assert rows(engine)[0][3] == "bad address"
