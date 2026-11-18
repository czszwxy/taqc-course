from sqlalchemy import select

from models import Notification


def deliver_pending(session, send, *, max_attempts=3):
    report = {"sent": 0, "retry": 0, "failed": 0}
    pending = session.scalars(
        select(Notification).where(Notification.status == "pending").order_by(Notification.id)
    ).all()
    for message in pending:
        message.attempts += 1
        try:
            send(message.recipient, message.text)
        except Exception as error:
            message.last_error = str(error)
            if message.attempts >= max_attempts:
                message.status = "failed"
                report["failed"] += 1
            else:
                report["retry"] += 1
        else:
            message.status = "sent"
            message.last_error = None
            report["sent"] += 1
        session.commit()
    return report
