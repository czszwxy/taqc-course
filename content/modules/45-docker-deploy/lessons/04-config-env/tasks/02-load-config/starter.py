from dataclasses import dataclass


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
    # твій код тут
    pass
