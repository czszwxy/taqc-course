from typing import get_type_hints

from solution import Notifier, notify_all


class EmailSender:
    def __init__(self):
        self.sent = []

    def send(self, to, text):
        self.sent.append((to, text))
        return True


class QuietSms:
    def send(self, to, text):
        return False


class BrokenPush:
    def send(self, to, text):
        raise ConnectionError("push service is down")


class NoSendMethod:
    def deliver(self, to, text):
        return True


def test_classes_with_send_match_the_protocol():
    """@runtime_checkable + Protocol: isinstance перевіряє наявність send, без наслідування."""
    assert isinstance(EmailSender(), Notifier)
    assert isinstance(BrokenPush(), Notifier)


def test_class_without_send_does_not_match():
    assert not isinstance(NoSendMethod(), Notifier)


def test_send_signature():
    """send(self, to: str, text: str) -> bool."""
    assert get_type_hints(Notifier.send) == {"to": str, "text": str, "return": bool}


def test_notify_all_annotations():
    assert get_type_hints(notify_all) == {"notifiers": list[Notifier], "to": str, "text": str, "return": int}


def test_counts_only_successful_sends():
    email = EmailSender()
    assert notify_all([email, QuietSms(), EmailSender()], "anna@example.com", "Ready") == 2
    assert email.sent == [("anna@example.com", "Ready")]


def test_a_broken_channel_does_not_stop_the_others():
    """Виняток у send — канал невдалий (try / except), цикл іде далі."""
    email = EmailSender()
    assert notify_all([BrokenPush(), email], "+380501112233", "Code 4821") == 1
    assert email.sent == [("+380501112233", "Code 4821")]


def test_no_channels():
    assert notify_all([], "x", "y") == 0
