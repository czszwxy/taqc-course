from functools import lru_cache


def make_price_lookup(fetch_price, maxsize=128):
    cached = lru_cache(maxsize=maxsize)(fetch_price)

    def price(product_id):
        return cached(int(str(product_id).strip()))

    price.clear = cached.cache_clear
    return price
