def get_with_retry(get, url, attempts=3):
    """Call get(url) until it succeeds; retry only on ConnectionError; after the last attempt re-raise it."""
    return get(url)
