from dataclasses import dataclass


class WorkerConfigError(Exception):
    def __init__(self, problems):
        super().__init__("; ".join(problems))
        self.problems = problems


@dataclass(frozen=True)
class WorkerConfig:
    queue_url: str
    concurrency: int = 4
    dry_run: bool = False
    retry_delays: tuple[float, ...] = (1.0, 5.0, 30.0)


def load_worker_config(env):
    # твій код тут
    pass
