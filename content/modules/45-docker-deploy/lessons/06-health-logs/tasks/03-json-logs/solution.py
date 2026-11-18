import json
import logging
from datetime import UTC, datetime

STANDARD_FIELDS = set(vars(logging.LogRecord("", logging.INFO, "", 0, "", None, None))) | {"message", "asctime"}
SENSITIVE_WORDS = ("password", "token", "secret")
MASK = "***"


def is_sensitive(key):
    return any(word in key.lower() for word in SENSITIVE_WORDS)


class JsonFormatter(logging.Formatter):
    def format(self, record):
        entry = {
            "time": datetime.fromtimestamp(record.created, tz=UTC).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for key, value in vars(record).items():
            if key not in STANDARD_FIELDS:
                entry[key] = MASK if is_sensitive(key) else value
        if record.exc_info:
            entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(entry, ensure_ascii=False, default=str)
