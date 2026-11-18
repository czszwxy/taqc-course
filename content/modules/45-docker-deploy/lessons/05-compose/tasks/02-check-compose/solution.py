from urllib.parse import urlsplit

from ports import parse_publish

STARTED = "service_started"
HEALTHY = "service_healthy"
LOCAL_HOSTS = ("localhost", "127.0.0.1")


def dependencies(service):
    found = service.get("depends_on") or {}
    if isinstance(found, list):
        return {name: STARTED for name in found}
    return {name: (options or {}).get("condition", STARTED) for name, options in found.items()}


def environment(service):
    found = service.get("environment") or {}
    if isinstance(found, list):
        pairs = [item.split("=", 1) for item in found]
        return {pair[0]: pair[1] if len(pair) == 2 else "" for pair in pairs}
    return {key: "" if value is None else str(value) for key, value in found.items()}


def points_to_localhost(value):
    return "://" in value and urlsplit(value).hostname in LOCAL_HOSTS


def check_compose(config):
    services = config.get("services") or {}
    problems = set()
    published = {}
    for name, service in services.items():
        service = service or {}
        if "image" not in service and "build" not in service:
            problems.add((name, "no-image"))
        for dependency, condition in dependencies(service).items():
            if dependency not in services:
                problems.add((name, "unknown-dependency"))
            elif condition == HEALTHY and "healthcheck" not in (services[dependency] or {}):
                problems.add((name, "no-healthcheck"))
        for spec in service.get("ports") or []:
            mapping = parse_publish(str(spec))
            if mapping.host_port is None:
                continue
            key = (mapping.host_port, mapping.protocol)
            owner = published.setdefault(key, name)
            if owner != name:
                problems.add((name, "port-conflict"))
        if any(points_to_localhost(value) for value in environment(service).values()):
            problems.add((name, "localhost-url"))
    return sorted(problems)
