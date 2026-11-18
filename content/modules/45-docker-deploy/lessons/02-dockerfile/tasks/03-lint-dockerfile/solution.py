CONTINUATION = "\\"


def instructions(text):
    """(line number, INSTRUCTION, arguments) for every instruction; continued lines are joined."""
    result = []
    buffer = ""
    start = 0
    for number, raw in enumerate(text.splitlines(), start=1):
        line = raw.strip()
        if not buffer and (not line or line.startswith("#")):
            continue
        if not buffer:
            start = number
        if line.endswith(CONTINUATION):
            buffer += line[:-1] + " "
            continue
        buffer += line
        word, _, args = buffer.partition(" ")
        result.append((start, word.upper(), args.strip()))
        buffer = ""
    if buffer:
        word, _, args = buffer.partition(" ")
        result.append((start, word.upper(), args.strip()))
    return result


def unpinned(image, stages):
    if image.lower() == "scratch" or image.lower() in stages:
        return False
    if "@" in image:
        return False
    last = image.split("/")[-1]
    if ":" not in last:
        return True
    return last.split(":", 1)[1] == "latest"


def copies_everything(args):
    words = args.split()
    if any(word.startswith("--from=") for word in words):
        return False
    sources = [word for word in words if not word.startswith("--")][:-1]
    return "." in sources or "./" in sources


def lint_dockerfile(text):
    steps = instructions(text)
    problems = []
    stages = set()
    first_install = next(
        (number for number, word, args in steps if word == "RUN" and "pip install" in args), None
    )
    for number, word, args in steps:
        if word == "FROM":
            words = [w for w in args.split() if not w.startswith("--")]
            if words and unpinned(words[0], stages):
                problems.append((number, "base-tag"))
            if len(words) >= 3 and words[1].upper() == "AS":
                stages.add(words[2].lower())
        elif word == "COPY":
            if first_install is not None and number < first_install and copies_everything(args):
                problems.append((number, "copy-before-install"))
        elif word == "RUN":
            if "pip install" in args and "--no-cache-dir" not in args:
                problems.append((number, "pip-cache"))
            if "apt-get update" in args and "apt-get install" not in args:
                problems.append((number, "apt-update-alone"))
        elif word in ("CMD", "ENTRYPOINT"):
            if not args.startswith("["):
                problems.append((number, "shell-form"))
    return sorted(problems)
