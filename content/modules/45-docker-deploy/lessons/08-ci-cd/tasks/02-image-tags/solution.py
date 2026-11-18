import re

SHORT_SHA = 7
TAG_PREFIX = "refs/tags/"
BRANCH_PREFIX = "refs/heads/"
PULL_PREFIX = "refs/pull/"
# Accepts v + MAJOR.MINOR.PATCH with an optional pre-release after "-".
# Matches: "v1.4.2", "v2.0.0-rc.1". Rejects: "v1.4", "1.4.2", "release-5".
# https://regex101.com/?flavor=python&regex=v%28%5Cd%2B%29%5C.%28%5Cd%2B%29%5C.%28%5Cd%2B%29%28-%5B0-9A-Za-z.-%5D%2B%29%3F
VERSION = re.compile(r"v(\d+)\.(\d+)\.(\d+)(-[0-9A-Za-z.-]+)?")
# Any character that a Docker tag cannot contain. Matches "/" in "feature/login"; keeps "a-Z_0.9".
# https://regex101.com/?flavor=python&regex=%5B%5EA-Za-z0-9_.-%5D
NOT_TAG_CHAR = re.compile(r"[^A-Za-z0-9_.-]")


def version_tags(name):
    found = VERSION.fullmatch(name)
    if found is None:
        raise ValueError(f"not a version tag: {name!r}")
    major, minor, patch, prerelease = found.groups()
    if prerelease:
        return [name[1:]]
    return [f"{major}.{minor}.{patch}", f"{major}.{minor}", major, "latest"]


def ref_tags(ref):
    if ref.startswith(TAG_PREFIX):
        return version_tags(ref.removeprefix(TAG_PREFIX))
    if ref.startswith(BRANCH_PREFIX):
        return [NOT_TAG_CHAR.sub("-", ref.removeprefix(BRANCH_PREFIX))]
    if ref.startswith(PULL_PREFIX):
        number = ref.removeprefix(PULL_PREFIX).split("/")[0]
        if number.isdecimal():
            return [f"pr-{number}"]
    raise ValueError(f"unsupported ref: {ref!r}")


def image_tags(registry, repository, ref, sha):
    image = f"{registry}/{repository}".lower()
    tags = ref_tags(ref) + [f"sha-{sha[:SHORT_SHA].lower()}"]
    return [f"{image}:{tag}" for tag in tags]
