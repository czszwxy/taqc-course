from collections import deque


def round_robin(jobs, quantum):
    if quantum < 1:
        raise ValueError("quantum must be at least 1")
    queue = deque(jobs)
    finished = []
    while queue:
        name, work = queue.popleft()
        if work <= quantum:
            finished.append(name)
        else:
            queue.append((name, work - quantum))
    return finished
