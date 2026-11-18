import copy

from solution import check_compose

HEALTHY_DB = {
    "image": "postgres:18",
    "environment": {"POSTGRES_PASSWORD": "example"},
    "healthcheck": {"test": ["CMD-SHELL", "pg_isready -U postgres"], "interval": "5s"},
}

GOOD = {
    "services": {
        "api": {
            "build": ".",
            "ports": ["8000:8000"],
            "environment": {"DATABASE_URL": "postgresql://shop:pw@db:5432/shop", "LOG_LEVEL": "INFO"},
            "depends_on": {"db": {"condition": "service_healthy"}},
        },
        "db": HEALTHY_DB,
    },
    "volumes": {"pgdata": {}},
}


def with_changes(**services):
    config = copy.deepcopy(GOOD)
    config["services"].update(services)
    return config


def test_good_file():
    """Правильний файл — []."""
    assert check_compose(GOOD) == []


def test_example_from_statement():
    """Приклад з умови: localhost в адресі бази і service_healthy без healthcheck."""
    config = {"services": {
        "api": {"build": ".", "ports": ["8000:8000"], "depends_on": {"db": {"condition": "service_healthy"}},
                "environment": {"DATABASE_URL": "postgresql://shop:pw@localhost:5432/shop"}},
        "db": {"image": "postgres:18"},
    }}
    assert check_compose(config) == [("api", "localhost-url"), ("api", "no-healthcheck")]


def test_no_image_nor_build():
    """Ні image, ні build — compose не знає, що запускати."""
    assert check_compose(with_changes(worker={"command": "python -m shop_worker"})) == [("worker", "no-image")]


def test_empty_service():
    """Сервіс без жодного ключа (None після YAML) — теж no-image."""
    assert check_compose(with_changes(cache=None)) == [("cache", "no-image")]


def test_unknown_dependency_list_form():
    """depends_on списком: ім'я з помилкою."""
    worker = {"build": ".", "depends_on": ["db", "redis"]}
    assert check_compose(with_changes(worker=worker)) == [("worker", "unknown-dependency")]


def test_unknown_dependency_dict_form():
    """depends_on словником теж перевіряється."""
    worker = {"build": ".", "depends_on": {"databse": {"condition": "service_started"}}}
    assert check_compose(with_changes(worker=worker)) == [("worker", "unknown-dependency")]


def test_healthy_needs_healthcheck():
    """service_healthy на сервіс без healthcheck — no-healthcheck."""
    config = with_changes(db={"image": "postgres:18"})
    assert check_compose(config) == [("api", "no-healthcheck")]


def test_other_conditions_need_no_healthcheck():
    """service_started (і список, і словник без condition) не потребує healthcheck."""
    config = with_changes(
        db={"image": "postgres:18"},
        api={"build": ".", "depends_on": {"db": None}},
        worker={"build": ".", "depends_on": ["db"]},
        migrate={"build": ".", "depends_on": {"db": {"condition": "service_started"}}},
    )
    assert check_compose(config) == []


def test_port_conflict_reported_for_later_service():
    """Той самий порт комп'ютера — скарга на кожен наступний сервіс, перший чистий."""
    config = with_changes(
        admin={"build": ".", "ports": ["127.0.0.1:8000:9000"]},
        docs={"image": "nginx:1.29", "ports": [8000]},
        worker={"build": ".", "ports": ["8000:8000"]},
    )
    assert check_compose(config) == [("admin", "port-conflict"), ("worker", "port-conflict")]


def test_different_protocol_or_no_host_port_is_fine():
    """UDP на тому самому номері і порт без host_port — не конфлікт."""
    config = with_changes(
        dns={"image": "coredns/coredns:1.12.1", "ports": ["8000:53/udp"]},
        metrics={"build": ".", "ports": ["8000"]},
    )
    assert check_compose(config) == []


def test_same_service_repeats_port_is_not_reported():
    """Конфлікт — лише між різними сервісами."""
    config = with_changes(api={"build": ".", "ports": ["8000:8000", "8000:8000"]})
    assert check_compose(config) == []


def test_localhost_in_list_environment():
    """environment списком KEY=value; 127.0.0.1 — теж localhost."""
    worker = {"build": ".", "environment": ["QUEUE_URL=redis://127.0.0.1:6379/0", "DRY_RUN"]}
    assert check_compose(with_changes(worker=worker)) == [("worker", "localhost-url")]


def test_localhost_only_in_urls():
    """Не адреса (немає ://) або хост інший — не скаржимося; None і числа не ламають перевірку."""
    api = {"build": ".", "environment": {"GREETING": "hello from localhost", "API_URL": "http://api:8000", "WORKERS": 2, "TOKEN": None}}
    assert check_compose(with_changes(api=api)) == []


def test_localhost_reported_once_per_service():
    """Дві погані змінні в одному сервісі — одна пара (унікальні)."""
    api = {"build": ".", "environment": {"DATABASE_URL": "postgresql://localhost/shop", "CACHE_URL": "redis://localhost:6379"}}
    assert check_compose(with_changes(api=api)) == [("api", "localhost-url")]


def test_result_is_sorted():
    """Відсортовано за сервісом, потім за кодом."""
    config = {"services": {
        "web": {"ports": ["80:80"], "depends_on": ["ghost"]},
        "api": {"build": ".", "ports": ["80:8000"], "environment": {"U": "http://localhost:1"}},
    }}
    assert check_compose(config) == [
        ("api", "localhost-url"),
        ("api", "port-conflict"),
        ("web", "no-image"),
        ("web", "unknown-dependency"),
    ]


def test_does_not_change_config():
    """Перевірка нічого не змінює у вхідному словнику."""
    config = copy.deepcopy(GOOD)
    check_compose(config)
    assert config == GOOD
