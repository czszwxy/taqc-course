def get_with_retry(get, url, attempts=3):
    """Call get(url) until it succeeds; retry only on ConnectionError; after the last attempt re-raise it."""
    for attempt in range(1, attempts):
        try:
            return get(url)
        except ConnectionError:
            if attempt == attempts - 1:
                raise
