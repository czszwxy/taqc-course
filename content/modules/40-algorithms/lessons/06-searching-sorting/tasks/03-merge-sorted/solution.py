def merge_sorted(first, second):
    merged = []
    i = j = 0
    while i < len(first) and j < len(second):
        if second[j] < first[i]:
            merged.append(second[j])
            j += 1
        else:
            merged.append(first[i])
            i += 1
    merged.extend(first[i:])
    merged.extend(second[j:])
    return merged
