from dataclasses import dataclass

DEFAULT_PORT = 8000
MIN_PORT = 1
MAX_PORT = 65535
TRUE_WORDS = {"1", "true", "yes", "on"}
FALSE_WORDS = {"0", "false", "no", "off"}
LOG_LEVELS = ("DEBUG", "INFO", "WARNING", "ERROR")
DEFAULT_LOG_LEVEL = "INFO"


class ConfigError(Exception):
    def __init__(self, problems):
        super().__init__("; ".join(problems))
        self.problems = problems


@dataclass(frozen=True)
class Config:
    database_url: str
    port: int = 8000
    debug: bool = False
    allowed_hosts: tuple[str, ...] = ()
    log_level: str = "INFO"


def load_config(env):
    problems = []

    database_url = env.get("DATABASE_URL", "").strip()
    if not database_url:
        problems.append("DATABASE_URL is required")

    port = DEFAULT_PORT
    raw_port = env.get("PORT", "").strip()
    if raw_port:
        if raw_port.isdecimal() and MIN_PORT <= int(raw_port) <= MAX_PORT:
            port = int(raw_port)
        else:
            problems.append(f"PORT must be a number from {MIN_PORT} to {MAX_PORT}")

    debug = False
    raw_debug = env.get("DEBUG", "").strip().lower()
    if raw_debug in TRUE_WORDS:
        debug = True
    elif raw_debug and raw_debug not in FALSE_WORDS:
        problems.append("DEBUG must be one of 1/0, true/false, yes/no, on/off")

    hosts = tuple(host.strip() for host in env.get("ALLOWED_HOSTS", "").split(",") if host.strip())
    if not debug and not hosts:
        problems.append("ALLOWED_HOSTS needs at least one host when DEBUG is off")

    log_level = env.get("LOG_LEVEL", "").strip().upper() or DEFAULT_LOG_LEVEL
    if log_level not in LOG_LEVELS:
        problems.append(f"LOG_LEVEL must be one of {', '.join(LOG_LEVELS)}")

    if problems:
        raise ConfigError(problems)
    return Config(database_url, port, debug, hosts, log_level)
