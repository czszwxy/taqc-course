from subject import Cart


class TestCart:
    def test_empty_cart_total_is_zero(self):
        assert Cart().total() == 0

    # твій код тут
