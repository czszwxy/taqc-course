import pytest

from solution import install_order


def check_order(dependencies, order):
    """Every package exactly once, every dependency before the package that needs it."""
    packages = set(dependencies) | {dep for deps in dependencies.values() for dep in deps}
    assert sorted(order) == sorted(packages), f"expected each of {sorted(packages)} exactly once, got {order}"
    position = {package: index for index, package in enumerate(order)}
    for package, deps in dependencies.items():
        for dep in deps:
            assert position[dep] < position[package], f"{dep} must come before {package} in {order}"


def test_example():
    dependencies = {"api": ["db", "auth"], "auth": ["db", "crypto"]}
    check_order(dependencies, install_order(dependencies))


def test_packages_only_seen_as_dependencies_are_included():
    """crypto не має власного ключа — але має бути в результаті."""
    order = install_order({"auth": ["crypto"]})
    assert order == ["crypto", "auth"]


def test_long_chain():
    dependencies = {"e": ["d"], "d": ["c"], "c": ["b"], "b": ["a"]}
    assert install_order(dependencies) == ["a", "b", "c", "d", "e"]


def test_independent_packages():
    dependencies = {"web": [], "worker": [], "cli": ["web"]}
    check_order(dependencies, install_order(dependencies))


def test_cycle_is_an_error():
    """Цикл — правильного порядку немає: ValueError (graphlib.CycleError — його підклас)."""
    with pytest.raises(ValueError):
        install_order({"a": ["b"], "b": ["c"], "c": ["a"]})


def test_self_dependency_is_a_cycle():
    with pytest.raises(ValueError):
        install_order({"a": ["a"]})


def test_empty():
    assert install_order({}) == []
