def pages_needed(items: int, per_page: int) -> int:
    """How many pages are needed to show all items; a partial last page counts."""
    full_pages = items // per_page
    has_partial_page = items % per_page > 0
    return max(1, full_pages + int(has_partial_page))
