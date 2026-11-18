import math
from dataclasses import dataclass

DEFAULT_CONCURRENCY = 4
MAX_CONCURRENCY = 64
DEFAULT_DELAYS = (1.0, 5.0, 30.0)
TRUE_WORDS = {"1", "true", "yes", "on"}
FALSE_WORDS = {"0", "false", "no", "off"}


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


def parse_delays(raw):
    delays = []
    for part in raw.split(","):
        try:
            delay = float(part.strip())
        except ValueError:
            return None
        if not (math.isfinite(delay) and delay > 0):
            return None
        delays.append(delay)
    return tuple(delays)


def load_worker_config(env):
    problems = []

    queue_url = env.get("QUEUE_URL", "").strip()
    if not queue_url:
        problems.append("QUEUE_URL is required")

    concurrency = DEFAULT_CONCURRENCY
    raw = env.get("CONCURRENCY", "").strip()
    if raw:
        if raw.isdecimal() and 1 <= int(raw) <= MAX_CONCURRENCY:
            concurrency = int(raw)
        else:
            problems.append(f"CONCURRENCY must be a number from 1 to {MAX_CONCURRENCY}")

    dry_run = False
    raw = env.get("DRY_RUN", "").strip().lower()
    if raw in TRUE_WORDS:
        dry_run = True
    elif raw and raw not in FALSE_WORDS:
        problems.append("DRY_RUN must be one of 1/0, true/false, yes/no, on/off")

    delays = DEFAULT_DELAYS
    raw = env.get("RETRY_DELAYS", "").strip()
    if raw:
        parsed = parse_delays(raw)
        if parsed is None:
            problems.append("RETRY_DELAYS must be positive numbers separated by commas")
        else:
            delays = parsed

    if problems:
        raise WorkerConfigError(problems)
    return WorkerConfig(queue_url, concurrency, dry_run, delays)
