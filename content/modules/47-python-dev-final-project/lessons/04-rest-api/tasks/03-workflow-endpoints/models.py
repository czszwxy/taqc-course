from datetime import date

from sqlalchemy import CheckConstraint, ForeignKey, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Ticket(Base):
    __tablename__ = "tickets"
    __table_args__ = (
        CheckConstraint("priority IN ('urgent', 'normal', 'low')", name="ticket_priority"),
        CheckConstraint(
            "status IN ('received', 'diagnosing', 'waiting_approval', 'repairing', 'ready', 'closed', 'cancelled')",
            name="ticket_status",
        ),
        CheckConstraint("estimate_total IS NULL OR estimate_total >= 0", name="ticket_estimate"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_email: Mapped[str] = mapped_column(String(254), index=True)
    device: Mapped[str] = mapped_column(String(60))
    problem: Mapped[str] = mapped_column(String(500))
    priority: Mapped[str] = mapped_column(String(10))
    status: Mapped[str] = mapped_column(String(20), default="received")
    received_on: Mapped[date]
    due_on: Mapped[date]
    estimate_total: Mapped[int | None]
    version: Mapped[int] = mapped_column(default=1)

    history: Mapped[list["StatusChange"]] = relationship(
        back_populates="ticket", cascade="all, delete-orphan", order_by="StatusChange.id"
    )


class StatusChange(Base):
    __tablename__ = "status_changes"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id"), index=True)
    from_status: Mapped[str] = mapped_column(String(20))
    to_status: Mapped[str] = mapped_column(String(20))
    by_role: Mapped[str] = mapped_column(String(10))
    changed_on: Mapped[date]

    ticket: Mapped[Ticket] = relationship(back_populates="history")


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'sent', 'failed')", name="notification_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id"), index=True)
    recipient: Mapped[str] = mapped_column(String(254))
    text: Mapped[str] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(10), default="pending")
    attempts: Mapped[int] = mapped_column(default=0)
    last_error: Mapped[str | None] = mapped_column(String(500))
