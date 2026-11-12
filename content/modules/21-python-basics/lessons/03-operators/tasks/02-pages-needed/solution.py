def pages_needed(items: int, per_page: int) -> int:
    full_pages = items // per_page
    has_partial_page = items % per_page > 0
    return full_pages + int(has_partial_page)
