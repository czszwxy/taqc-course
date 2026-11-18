class Autocomplete:
    def __init__(self):
        self._root = {"children": {}, "weight": 0}

    def add(self, query, weight=1):
        query = query.strip().lower()
        if not query:
            raise ValueError("query must not be empty")
        node = self._root
        for letter in query:
            node = node["children"].setdefault(letter, {"children": {}, "weight": 0})
        node["weight"] += weight

    def suggest(self, prefix, limit=5):
        prefix = prefix.strip().lower()
        if not prefix or limit < 1:
            return []
        node = self._root
        for letter in prefix:
            if letter not in node["children"]:
                return []
            node = node["children"][letter]
        found = []
        stack = [(prefix, node)]
        while stack:
            word, current = stack.pop()
            if current["weight"] > 0:
                found.append((word, current["weight"]))
            for letter, child in current["children"].items():
                stack.append((word + letter, child))
        found.sort(key=lambda item: (-item[1], item[0]))
        return [word for word, _ in found[:limit]]
