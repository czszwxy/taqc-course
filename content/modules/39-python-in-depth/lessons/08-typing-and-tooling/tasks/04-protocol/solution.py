from typing import Protocol, runtime_checkable


@runtime_checkable
class Notifier(Protocol):
    def send(self, to: str, text: str) -> bool: ...


def notify_all(notifiers: list[Notifier], to: str, text: str) -> int:
    delivered = 0
    for notifier in notifiers:
        try:
            if notifier.send(to, text):
                delivered += 1
        except Exception:
            continue
    return delivered
