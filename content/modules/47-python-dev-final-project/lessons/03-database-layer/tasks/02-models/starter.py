from datetime import date

from sqlalchemy import CheckConstraint, ForeignKey, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# твій код тут: Ticket і StatusChange


class Notification(Base):
    """Готовий приклад: повідомлення клієнту, яке доставить окремий процес (урок 5)."""

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
