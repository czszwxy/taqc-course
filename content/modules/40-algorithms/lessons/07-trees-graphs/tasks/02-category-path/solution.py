def category_path(tree, name):
    if tree["name"] == name:
        return [tree["name"]]
    for child in tree.get("children", []):
        path = category_path(child, name)
        if path is not None:
            return [tree["name"], *path]
    return None
