def log_line(level, *parts, sep=" "):
    prefix = f"[{level.upper()}]"
    if not parts:
        return prefix
    message = sep.join([str(p) for p in parts])
    return f"{prefix} {message}"
