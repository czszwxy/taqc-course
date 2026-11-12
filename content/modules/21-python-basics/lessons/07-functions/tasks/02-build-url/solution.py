def build_url(base: str, path: str, page: int = 1, per_page: int = 10) -> str:
    clean_base = base.rstrip("/")
    clean_path = path.lstrip("/")
    return f"{clean_base}/{clean_path}?page={page}&per_page={per_page}"
