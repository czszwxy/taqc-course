def run(words, cart):
    match words:
        case ["add", sku]:
            cart[sku] = cart.get(sku, 0) + 1
            return f"added 1 x {sku}"
        case ["add", sku, qty] if qty.isdigit() and int(qty) > 0:
            cart[sku] = cart.get(sku, 0) + int(qty)
            return f"added {int(qty)} x {sku}"
        case ["remove", sku, *more]:
            removed = 0
            for item in [sku, *more]:
                if cart.pop(item, None) is not None:
                    removed += 1
            return f"removed {removed}"
        case ["clear"]:
            cart.clear()
            return "cart cleared"
        case ["show"]:
            if not cart:
                return "cart is empty"
            return ", ".join(f"{sku} x {count}" for sku, count in sorted(cart.items()))
        case []:
            return "no command"
        case _:
            return f"unknown command: {' '.join(words)}"
