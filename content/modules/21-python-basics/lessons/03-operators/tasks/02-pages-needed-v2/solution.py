def boxes_needed(items: int, per_box: int) -> int:
    full_boxes = items // per_box
    has_partial_box = items % per_box > 0
    return full_boxes + int(has_partial_box)
