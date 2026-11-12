def add_tag(tag: str, tags: list[str] | None = None) -> list[str]:
    if tags is None:
        return [tag]
    return tags + [tag]
