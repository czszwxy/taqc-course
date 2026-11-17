from solution import shortest_route

GRAPH = {"A": ["B", "E"], "B": ["C"], "C": ["D"], "E": ["D"], "D": []}


def test_shortest_not_first_found_by_depth():
    """BFS, а не DFS: DFS пішов би A → B → C → D."""
    assert shortest_route(GRAPH, "A", "D") == ["A", "E", "D"]


def test_start_equals_end():
    assert shortest_route(GRAPH, "B", "B") == ["B"]


def test_unreachable():
    """D не має виходів — з D до A не дістатися."""
    assert shortest_route(GRAPH, "D", "A") is None


def test_unknown_points():
    assert shortest_route(GRAPH, "X", "A") is None
    assert shortest_route(GRAPH, "A", "X") is None


def test_cycles_do_not_hang():
    """Без відвіданих BFS ходив би по колу."""
    graph = {"A": ["B"], "B": ["A", "C"], "C": ["B"]}
    assert shortest_route(graph, "A", "C") == ["A", "B", "C"]


def test_tie_follows_the_neighbour_order():
    """Два маршрути по 2 переходи — перший, знайдений при переборі сусідів у порядку списку."""
    graph = {"A": ["B", "C"], "B": ["D"], "C": ["D"], "D": []}
    assert shortest_route(graph, "A", "D") == ["A", "B", "D"]


def test_neighbour_without_its_own_key():
    """Пункт без власного ключа в графі: graph.get(node, [])."""
    assert shortest_route({"A": ["Z"]}, "A", "Z") == ["A", "Z"]
