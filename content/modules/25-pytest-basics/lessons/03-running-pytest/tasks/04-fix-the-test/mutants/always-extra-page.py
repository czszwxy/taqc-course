def pages_needed(items: int, per_page: int) -> int:
    """How many pages are needed to show all items; a partial last page counts."""
    return items // per_page + 1
