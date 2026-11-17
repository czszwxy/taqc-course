PAIRS = {")": "(", "]": "[", "}": "{"}
OPENING = set(PAIRS.values())


def is_balanced(text):
    stack = []
    for char in text:
        if char in OPENING:
            stack.append(char)
        elif char in PAIRS:
            if not stack or stack.pop() != PAIRS[char]:
                return False
    return not stack
