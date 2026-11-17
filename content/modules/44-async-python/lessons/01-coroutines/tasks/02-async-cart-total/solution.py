import asyncio

from prices import PriceService, UnknownProduct


async def cart_total(service, cart):
    total = 0
    for sku, quantity in cart.items():
        price = await service.get_price(sku)
        total += price * quantity
    return total


def checkout_total(cart):
    return asyncio.run(cart_total(PriceService(), cart))


if __name__ == "__main__":
    print(checkout_total({"MOUSE-01": 2, "CABLE-C1": 1}))
