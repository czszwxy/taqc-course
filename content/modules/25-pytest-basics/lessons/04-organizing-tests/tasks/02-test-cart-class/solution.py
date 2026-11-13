from subject import Cart


class TestCart:
    def test_empty_cart_total_is_zero(self):
        assert Cart().total() == 0

    def test_total_multiplies_by_quantity(self):
        cart = Cart()
        cart.add("Mouse", 450, 2)
        assert cart.total() == 900

    def test_same_item_twice_adds_up(self):
        cart = Cart()
        cart.add("Mouse", 450)
        cart.add("Mouse", 450, 2)
        assert cart.count() == 3

    def test_count_is_units_not_lines(self):
        cart = Cart()
        cart.add("Mouse", 450, 2)
        cart.add("Cable", 150)
        assert cart.count() == 3

    def test_remove_keeps_other_items(self):
        cart = Cart()
        cart.add("Mouse", 450)
        cart.add("Cable", 150)
        cart.remove("Mouse")
        assert cart.total() == 150
