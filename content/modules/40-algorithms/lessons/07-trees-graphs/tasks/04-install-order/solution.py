from graphlib import TopologicalSorter


def install_order(dependencies):
    return list(TopologicalSorter(dependencies).static_order())
