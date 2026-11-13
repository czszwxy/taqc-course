class ProductsApi:
    def __init__(self, session, base_url):
        self.session = session
        self.base_url = base_url

    def get_price(self, product_id):
        url = f"{self.base_url}/products/{product_id}"
        status, body = self.session.get(url)
        if status == 200:
            return body["price"]
        if status == 404:
            return None
        raise RuntimeError(f"GET {url} failed: {status}")

    def total(self, product_ids):
        prices = [self.get_price(product_id) for product_id in product_ids]
        return sum(price for price in prices if price is not None)
