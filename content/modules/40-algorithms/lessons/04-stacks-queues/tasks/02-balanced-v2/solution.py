def valid_nesting(tags):
    stack = []
    for tag in tags:
        if tag.endswith("/>"):
            continue
        if tag.startswith("</"):
            if not stack or stack.pop() != tag[2:-1]:
                return False
        else:
            stack.append(tag[1:-1])
    return not stack
