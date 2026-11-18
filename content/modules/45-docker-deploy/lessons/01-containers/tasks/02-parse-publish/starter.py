from dataclasses import dataclass


@dataclass(frozen=True)
class PortMapping:
    host_ip: str
    host_port: int | None
    container_port: int
    protocol: str


def parse_publish(spec):
    # твій код тут
    pass


def browser_url(mapping):
    # твій код тут
    pass
