def search_url(base: str, query: str, page: int = 1, sort: str = "relevance") -> str:
    clean_base = base.rstrip("/")
    clean_query = query.strip().replace(" ", "+")
    return f"{clean_base}/search?q={clean_query}&page={page}&sort={sort}"
