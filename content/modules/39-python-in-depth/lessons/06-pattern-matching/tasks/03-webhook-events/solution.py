def describe(event):
    match event:
        case {"type": "payment.succeeded", "amount": int(amount)} if amount > 0:
            return f"paid {amount} UAH"
        case {"type": "payment.failed", "reason": str(reason)}:
            return f"payment failed: {reason}"
        case {"type": "refund.created", "amount": int(amount), "order_id": order_id}:
            return f"refund {amount} UAH for order {order_id}"
        case {"type": str(kind)}:
            return f"ignored: {kind}"
        case _:
            return "invalid event"
