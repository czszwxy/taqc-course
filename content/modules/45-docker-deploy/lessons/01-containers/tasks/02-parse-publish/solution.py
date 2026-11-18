from dataclasses import dataclass

ANY_ADDRESS = "0.0.0.0"
PROTOCOLS = ("tcp", "udp")
MIN_PORT = 1
MAX_PORT = 65535


@dataclass(frozen=True)
class PortMapping:
    host_ip: str
    host_port: int | None
    container_port: int
    protocol: str


def to_port(text):
    if not text.isdecimal() or not MIN_PORT <= int(text) <= MAX_PORT:
        raise ValueError(f"not a port from {MIN_PORT} to {MAX_PORT}: {text!r}")
    return int(text)


def parse_publish(spec):
    spec = spec.strip()
    protocol = "tcp"
    if "/" in spec:
        spec, protocol = spec.rsplit("/", 1)
        protocol = protocol.lower()
        if protocol not in PROTOCOLS:
            raise ValueError(f"unknown protocol: {protocol!r}")
    parts = spec.split(":")
    if len(parts) == 1:
        return PortMapping(ANY_ADDRESS, None, to_port(parts[0]), protocol)
    if len(parts) == 2:
        return PortMapping(ANY_ADDRESS, to_port(parts[0]), to_port(parts[1]), protocol)
    if len(parts) == 3 and parts[0]:
        return PortMapping(parts[0], to_port(parts[1]), to_port(parts[2]), protocol)
    raise ValueError(f"cannot parse port mapping: {spec!r}")


def browser_url(mapping):
    if mapping.host_port is None:
        return None
    host = "localhost" if mapping.host_ip == ANY_ADDRESS else mapping.host_ip
    return f"http://{host}:{mapping.host_port}"
