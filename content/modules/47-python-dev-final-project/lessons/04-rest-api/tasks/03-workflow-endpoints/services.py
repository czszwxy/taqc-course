from sqlalchemy import update

from models import Notification, StatusChange, Ticket
from repairs import RepairError, Status, change_status


def move_ticket(session, ticket_id, new_status, *, role, version, today, estimate_total=None):
    ticket = session.get(Ticket, ticket_id)
    if ticket is None:
        raise RepairError("not_found")
    old_status = Status(ticket.status)
    new_status = change_status(old_status, new_status, role)
    if new_status == Status.WAITING_APPROVAL and estimate_total is None:
        raise RepairError("estimate_required")

    values = {"status": new_status.value, "version": Ticket.version + 1}
    if estimate_total is not None:
        values["estimate_total"] = estimate_total
    result = session.execute(
        update(Ticket).where(Ticket.id == ticket_id, Ticket.version == version).values(**values)
    )
    if result.rowcount == 0:
        session.rollback()
        raise RepairError("conflict")

    session.add(
        StatusChange(
            ticket_id=ticket_id,
            from_status=old_status.value,
            to_status=new_status.value,
            by_role=role,
            changed_on=today,
        )
    )
    if new_status == Status.READY:
        session.add(
            Notification(
                ticket_id=ticket_id,
                recipient=ticket.customer_email,
                text=f"Your {ticket.device} is ready for pickup (ticket #{ticket_id}).",
            )
        )
    session.commit()
    return ticket
