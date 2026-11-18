import pytest

from solution import PortMapping, browser_url, parse_publish


def test_container_port_only():
    """"8000" — лише порт контейнера: host_port None, усі інтерфейси, tcp."""
    assert parse_publish("8000") == PortMapping("0.0.0.0", None, 8000, "tcp")


def test_host_then_container():
    """Порядок: спершу порт комп'ютера, потім контейнера — "8080:8000" це host 8080."""
    assert parse_publish("8080:8000") == PortMapping("0.0.0.0", 8080, 8000, "tcp")


def test_with_ip():
    """Три частини: IP-адреса, порт комп'ютера, порт контейнера."""
    assert parse_publish("127.0.0.1:8080:8000") == PortMapping("127.0.0.1", 8080, 8000, "tcp")


def test_udp_protocol():
    """Протокол — після "/"."""
    assert parse_publish("5353:53/udp") == PortMapping("0.0.0.0", 5353, 53, "udp")


def test_protocol_any_case_and_spaces():
    """Пробіли по краях ігноруються, протокол повертається малими літерами."""
    assert parse_publish("  127.0.0.1:5432:5432/TCP ") == PortMapping("127.0.0.1", 5432, 5432, "tcp")


def test_port_bounds_are_valid():
    """1 і 65535 — ще коректні порти."""
    assert parse_publish("1:65535") == PortMapping("0.0.0.0", 1, 65535, "tcp")


@pytest.mark.parametrize("spec", ["0:8000", "8080:0", "8080:70000", "65536:80"])
def test_port_out_of_range(spec):
    """Порт — від 1 до 65535."""
    with pytest.raises(ValueError):
        parse_publish(spec)


@pytest.mark.parametrize("spec", ["", "abc", "80a:80", "8080:", "-1:80", "9090-9091:8080-8081"])
def test_not_a_number(spec):
    """Порт — ціле число; діапазони не підтримуємо."""
    with pytest.raises(ValueError):
        parse_publish(spec)


@pytest.mark.parametrize("spec", ["8000/http", "8000/", "1:2:3:4", ":8080:8000"])
def test_bad_shape(spec):
    """Невідомий протокол, забагато частин або порожня IP-адреса — ValueError."""
    with pytest.raises(ValueError):
        parse_publish(spec)


def test_browser_url_any_address():
    """0.0.0.0 — у браузері відкривай localhost і порт комп'ютера (не контейнера)."""
    assert browser_url(parse_publish("8080:8000")) == "http://localhost:8080"


def test_browser_url_specific_ip():
    """Конкретна IP-адреса лишається в адресі."""
    assert browser_url(parse_publish("127.0.0.1:9000:8000")) == "http://127.0.0.1:9000"


def test_browser_url_without_host_port():
    """Порт комп'ютера не задано — адреси наперед не знаємо."""
    assert browser_url(parse_publish("8000")) is None
