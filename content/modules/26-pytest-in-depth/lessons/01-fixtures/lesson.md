# Фікстури

У модулі pytest Basics кожен тест сам готував свої дані: створював кошик, будував замовлення. Коли підготовка повторюється в десятках тестів, її виносять у **фікстуру** — функцію, яка готує дані для тесту і (за потреби) прибирає після нього.

## Перша фікстура

```python
import pytest

@pytest.fixture
def checklist():
    items = Checklist("Login page")
    items.add("valid password")
    items.add("wrong password")
    return items

def test_progress_starts_at_zero(checklist):
    assert checklist.progress() == "0/2"

def test_check_one_item(checklist):
    checklist.check("valid password")
    assert checklist.progress() == "1/2"
```

- `@pytest.fixture` перетворює функцію на фікстуру.
- Тест **просить** фікстуру, назвавши параметр так само, як функцію: `def test_...(checklist)`.
- pytest викликає фікстуру **перед кожним тестом** і передає результат — кожен тест отримує свій свіжий чек-лист.

## Розбір: як pytest готує тест

Фікстури можуть просити інші фікстури:

```python
@pytest.fixture
def empty_cart():
    return Cart()

@pytest.fixture
def cart_with_mouse(empty_cart):
    empty_cart.add("Mouse", 450)
    return empty_cart

def test_total(cart_with_mouse):
    assert cart_with_mouse.total() == 450
```

| Крок | Що робить pytest |
|---|---|
| 1 | бачить, що `test_total` просить `cart_with_mouse` |
| 2 | бачить, що `cart_with_mouse` просить `empty_cart` |
| 3 | викликає `empty_cart()` → новий кошик |
| 4 | викликає `cart_with_mouse(кошик)` → кошик з мишкою |
| 5 | викликає `test_total(кошик з мишкою)` |

Ланцюжок будується сам — тест лише називає те, що йому потрібно.

## Вбудовані фікстури

| Фікстура | Що дає |
|---|---|
| `tmp_path` | нова порожня папка для тесту (`pathlib.Path`) |
| `capsys` | перехоплений вивід: `capsys.readouterr().out` — усе, що надрукував код |
| `monkeypatch` | тимчасова підміна атрибутів і змінних оточення (урок про mock) |

```python
def test_report_is_printed(capsys):
    print_report(["passed", "failed"])
    out = capsys.readouterr().out
    assert "Failed: 1" in out
```

## Фікстура чи хелпер?

| Хелпер `make_order(**overrides)` | Фікстура `@pytest.fixture` |
|---|---|
| викликаєш сам, з параметрами | pytest викликає сам, тест лише просить |
| кілька різних об'єктів в одному тесті — зручно | одне значення на тест |
| немає прибирання | може прибрати за собою (наступний урок) |

Їх часто поєднують: фікстура повертає хелпер-фабрику (урок про conftest).

> [!QA]
> Фікстури — головний інструмент фреймворку на pytest: залогінений користувач, клієнт API, сторінка браузера, тестові дані. У Playwright для Python навіть `page` — це фікстура. Чим раніше ти звикнеш думати фікстурами, тим легше буде далі.

## Типові помилки

- Виклик фікстури напряму (`checklist()` у тесті) — pytest видасть помилку: фікстури не призначені для прямого виклику, їх просять параметром.
- Забутий `@pytest.fixture` — `fixture 'checklist' not found` або функція не та.
- Назва параметра не збігається з назвою фікстури — `fixture 'cheklist' not found`.
- Одна «товста» фікстура на все — краще кілька маленьких, що складаються ланцюжком.

## Підсумок

- `@pytest.fixture` — функція, що готує дані; тест просить її параметром з тим самим іменем.
- Фікстура викликається для кожного тесту окремо — дані свіжі.
- Фікстури можуть просити інші фікстури — pytest будує ланцюжок сам.
- Вбудовані: `tmp_path`, `capsys`, `monkeypatch`.
- Хелпер — коли потрібні параметри або кілька об'єктів; фікстура — коли потрібна підготовка й прибирання.
