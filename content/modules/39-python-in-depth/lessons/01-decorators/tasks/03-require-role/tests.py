import pytest

from solution import require_role

ADMIN = {"name": "Olena", "roles": ["admin", "support"]}
SUPPORT = {"name": "Marta", "roles": ["support"]}
GUEST = {"name": "Ihor", "roles": []}


def make_delete_order(deleted):
    @require_role("admin")
    def delete_order(user, order_id):
        """Delete an order (admins only)."""
        deleted.append(order_id)
        return f"order {order_id} deleted"

    return delete_order


def test_user_with_the_role_can_call():
    """Є роль — виклич функцію з усіма аргументами й поверни її результат."""
    deleted = []
    delete_order = make_delete_order(deleted)
    assert delete_order(ADMIN, 1001) == "order 1001 deleted"
    assert deleted == [1001]


def test_user_without_the_role_gets_permission_error():
    """Немає ролі — raise PermissionError(f\"{role} role required\")."""
    delete_order = make_delete_order([])
    with pytest.raises(PermissionError, match="admin role required"):
        delete_order(SUPPORT, 1001)


def test_function_is_not_called_when_denied():
    """Перевіряй права до виклику func: заборонена дія не повинна виконатися."""
    deleted = []
    delete_order = make_delete_order(deleted)
    with pytest.raises(PermissionError):
        delete_order(GUEST, 1001)
    assert deleted == []


def test_keyword_arguments_are_passed_through():
    """Обгортка приймає *args, **kwargs і передає їх далі."""
    delete_order = make_delete_order([])
    assert delete_order(ADMIN, order_id=7) == "order 7 deleted"


def test_user_without_roles_key_is_denied():
    """Ключа roles може не бути: user.get(\"roles\", []) замість user[\"roles\"]."""
    delete_order = make_delete_order([])
    with pytest.raises(PermissionError):
        delete_order({"name": "anonymous"}, 1)


def test_each_decorated_function_checks_its_own_role():
    """role запам'ятовується окремо для кожного @require_role(...)."""

    @require_role("support")
    def reply(user, ticket_id):
        return f"replied to {ticket_id}"

    assert reply(SUPPORT, 5) == "replied to 5"
    with pytest.raises(PermissionError, match="support role required"):
        reply(GUEST, 5)


def test_name_and_docstring_are_kept():
    """Постав @wraps(func) над обгорткою."""
    delete_order = make_delete_order([])
    assert delete_order.__name__ == "delete_order"
    assert delete_order.__doc__ == "Delete an order (admins only)."
