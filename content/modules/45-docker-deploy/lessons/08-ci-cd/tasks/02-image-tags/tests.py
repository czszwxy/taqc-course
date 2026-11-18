import pytest

from solution import image_tags

IMAGE = "ghcr.io/gadget-shop/api"
SHA = "9f3c2a1b7e0d4c55"


def tags(ref, sha=SHA):
    prefix = IMAGE + ":"
    result = image_tags("ghcr.io", "gadget-shop/api", ref, sha)
    assert all(name.startswith(prefix) for name in result), f"кожне ім'я починається з {prefix}: {result}"
    return [name.removeprefix(prefix) for name in result]


def test_example_from_statement():
    """Приклад з умови: повні імена, sha скорочено до 7 символів малими."""
    assert image_tags("ghcr.io", "gadget-shop/api", "refs/tags/v1.4.2", "9F3C2A1B7E") == [
        "ghcr.io/gadget-shop/api:1.4.2",
        "ghcr.io/gadget-shop/api:1.4",
        "ghcr.io/gadget-shop/api:1",
        "ghcr.io/gadget-shop/api:latest",
        "ghcr.io/gadget-shop/api:sha-9f3c2a1",
    ]


def test_image_name_lowercase():
    """Назва репозиторію — малими літерами."""
    result = image_tags("ghcr.io", "Gadget-Shop/API", "refs/heads/main", SHA)
    assert result == ["ghcr.io/gadget-shop/api:main", "ghcr.io/gadget-shop/api:sha-9f3c2a1"]


def test_release_with_multi_digit_numbers():
    """Числа версії можуть мати кілька цифр."""
    assert tags("refs/tags/v10.12.103") == ["10.12.103", "10.12", "10", "latest", "sha-9f3c2a1"]


@pytest.mark.parametrize("ref, version", [("refs/tags/v2.0.0-rc.1", "2.0.0-rc.1"), ("refs/tags/v3.1.0-beta", "3.1.0-beta")])
def test_prerelease_only_full_version(ref, version):
    """Пре-реліз — лише повна версія, без 2.0 / 2 / latest."""
    assert tags(ref) == [version, "sha-9f3c2a1"]


def test_main_branch():
    """Гілка main — тег main і sha."""
    assert tags("refs/heads/main") == ["main", "sha-9f3c2a1"]


def test_branch_with_slash_sanitised():
    """/ і інші заборонені символи — на -, регістр і крапки лишаються."""
    assert tags("refs/heads/feature/Login-Form") == ["feature-Login-Form", "sha-9f3c2a1"]
    assert tags("refs/heads/fix/cart#12 v1.2") == ["fix-cart-12-v1.2", "sha-9f3c2a1"]


def test_pull_request():
    """PR — pr-<номер>."""
    assert tags("refs/pull/42/merge") == ["pr-42", "sha-9f3c2a1"]


def test_sha_tag_always_last_and_lowercase():
    """sha- — завжди останній, 7 символів, малими."""
    assert tags("refs/heads/main", sha="ABCDEF0123456789")[-1] == "sha-abcdef0"


@pytest.mark.parametrize("ref", ["refs/tags/release-5", "refs/tags/v1.4", "refs/tags/1.4.2", "refs/tags/v1.4.2.1", "refs/remotes/origin/main", "main", "refs/pull/abc/merge"])
def test_unsupported_refs(ref):
    """Не версія або невідомий ref — ValueError."""
    with pytest.raises(ValueError):
        image_tags("ghcr.io", "gadget-shop/api", ref, SHA)
