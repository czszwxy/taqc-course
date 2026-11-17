def binary_search(sorted_ids, target):
    low, high = 0, len(sorted_ids) - 1
    while low <= high:
        middle = (low + high) // 2
        value = sorted_ids[middle]
        if value == target:
            return middle
        if value < target:
            low = middle + 1
        else:
            high = middle - 1
    return -1
