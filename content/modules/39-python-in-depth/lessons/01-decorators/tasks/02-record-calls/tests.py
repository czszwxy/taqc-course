import pytest

from solution import record_calls


def make_add_item():
    @record_calls
    def add_item(cart_id, sku, quantity=1):
        """Add a product to the cart."""
        return f"{cart_id}:{sku}x{quantity}"

    return add_item


def test_result_is_passed_through():
    """Обгортка має повернути те, що повернула оригінальна функція: return func(*args, **kwargs)."""
    add_item = make_add_item()
    assert add_item(7, "KB-01") == "7:KB-01x1"


def test_positional_and_keyword_arguments_are_recorded():
    """Кожен виклик додає (args, kwargs): args — кортеж, kwargs — словник."""
    add_item = make_add_item()
    add_item(7, "KB-01")
    add_item(7, "MS-02", quantity=3)
    assert add_item.calls == [((7, "KB-01"), {}), ((7, "MS-02"), {"quantity": 3})]


def test_calls_list_exists_before_the_first_call():
    """Список calls має існувати одразу після декорування: wrapper.calls = [] перед return wrapper."""
    add_item = make_add_item()
    assert add_item.calls == []


def test_each_decorated_function_has_its_own_list():
    """Список створюй усередині record_calls — свій для кожної задекорованої функції, а не один глобальний."""
    first = make_add_item()
    second = make_add_item()
    first(1, "A")
    assert second.calls == []


def test_name_and_docstring_are_kept():
    """Додай @wraps(func) над wrapper — інакше __name__ стане 'wrapper', а docstring зникне."""
    add_item = make_add_item()
    assert add_item.__name__ == "add_item"
    assert add_item.__doc__ == "Add a product to the cart."


def test_a_failed_call_is_recorded_too():
    """Запиши виклик до виклику func — тоді він потрапить у calls, навіть якщо функція кинула виняток."""

    @record_calls
    def charge(amount):
        raise ValueError("card declined")

    with pytest.raises(ValueError):
        charge(100)
    assert charge.calls == [((100,), {})]
