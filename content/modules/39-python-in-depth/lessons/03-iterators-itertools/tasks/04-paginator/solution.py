class Paginator:
    def __init__(self, fetch_page):
        self.fetch_page = fetch_page

    def __iter__(self):
        page = 1
        while True:
            items = self.fetch_page(page)
            if not items:
                return
            yield from items
            page += 1
