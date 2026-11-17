from collections import deque


def shortest_route(graph, start, end):
    if start not in graph:
        return None
    previous = {start: None}
    queue = deque([start])
    while queue:
        node = queue.popleft()
        if node == end:
            path = []
            while node is not None:
                path.append(node)
                node = previous[node]
            return path[::-1]
        for neighbour in graph.get(node, []):
            if neighbour not in previous:
                previous[neighbour] = node
                queue.append(neighbour)
    return None
