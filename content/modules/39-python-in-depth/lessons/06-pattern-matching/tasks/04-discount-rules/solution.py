from rules import FixedOff, MinTotal, PercentOff

MAX_PERCENT = 100


def apply_rule(total, rule):
    match rule:
        case PercentOff(percent) if 1 <= percent <= MAX_PERCENT:
            return total - total * percent // MAX_PERCENT
        case PercentOff():
            raise ValueError("invalid percent")
        case FixedOff(amount):
            return max(total - amount, 0)
        case MinTotal(minimum, inner) if total >= minimum:
            return apply_rule(total, inner)
        case MinTotal():
            return total
        case _:
            raise TypeError("unknown rule")
