# Підміна залежностей: monkeypatch і unittest.mock

Код рідко живе сам по собі: він ходить у мережу, читає час, змінні оточення, генерує випадкові числа. У unit-тесті все це заважає: мережа повільна й нестабільна, час змінюється, а помилку сервера неможливо отримати на замовлення. Рішення — **підмінити залежність** контрольованою заглушкою.

## monkeypatch

Вбудована фікстура pytest, яка тимчасово змінює атрибути й оточення і **сама все повертає** після тесту:

```python
import weather

def test_forecast_text(monkeypatch):
    monkeypatch.setattr(weather, "fetch_temperature", lambda city: 21)
    assert weather.forecast_text("Kyiv") == "Kyiv: 21°C"

def test_uses_staging(monkeypatch):
    monkeypatch.setenv("BASE_URL", "https://staging.example.test")
    monkeypatch.setitem(weather.SETTINGS, "units", "metric")
    ...
```

| Метод | Що підміняє |
|---|---|
| `setattr(obj, "name", value)` | атрибут або функцію модуля / об'єкта |
| `setattr("module.name", value)` | те саме за рядком-шляхом |
| `setenv("NAME", "value")` / `delenv("NAME")` | змінну оточення |
| `setitem(dict, key, value)` | елемент словника (налаштування) |

## Розбір: підміняй там, де шукають

```python
# api.py
def fetch_status(order_id): ...          # справжній запит

# shop.py
from api import fetch_status             # ім'я скопійовано в модуль shop

def order_label(order_id):
    return f"#{order_id}: {fetch_status(order_id)}"
```

| Що підмінили | Що викличе `shop.order_label` |
|---|---|
| `monkeypatch.setattr(api, "fetch_status", fake)` | **справжню** функцію — `shop` тримає своє посилання |
| `monkeypatch.setattr(shop, "fetch_status", fake)` | заглушку ✅ |

`from api import fetch_status` створює в модулі `shop` власне ім'я. Код шукає функцію в **своєму** модулі — там її й треба підмінити. Це найчастіша причина «я підмінив, а викликається справжня функція».

## Фейк, що записує виклики

```python
def test_requests_correct_url(monkeypatch):
    requested = []

    def fake_fetch(url):
        requested.append(url)
        return {"temp": 21}

    monkeypatch.setattr(weather, "fetch_json", fake_fetch)
    weather.forecast_text("Kyiv")
    assert requested == ["https://api.example.test/weather/Kyiv"]
```

Фейк дає контрольовану відповідь **і** дозволяє перевірити, з якими аргументами його викликали.

## unittest.mock

Стандартна бібліотека має готові «записувачі» — об'єкти `Mock`:

```python
from unittest.mock import Mock, patch

send = Mock()                                   # приймає будь-які виклики
send("hello")
send.assert_called_once_with("hello")           # перевірка аргументів
send.call_count                                 # 1

get = Mock(return_value={"ok": True})           # що повернути
flaky = Mock(side_effect=[ConnectionError(), {"ok": True}])   # спершу помилка, потім відповідь
broken = Mock(side_effect=TimeoutError("no response"))        # завжди помилка
```

| Атрибут / метод | Для чого |
|---|---|
| `return_value` | що повертає виклик |
| `side_effect` | виняток, список відповідей по черзі або функція |
| `assert_called_once_with(...)` | викликано рівно раз з такими аргументами |
| `assert_not_called()` | не викликано жодного разу |
| `call_count`, `call_args_list` | скільки разів і з чим |

`patch` підміняє атрибут на час блоку чи тесту:

```python
with patch("weather.fetch_temperature", return_value=21) as fake:
    assert weather.forecast_text("Kyiv") == "Kyiv: 21°C"
fake.assert_called_once_with("Kyiv")
```

Як декоратор `@patch("weather.fetch_temperature")` передає mock **першим** аргументом тесту, перед фікстурами.

> [!QA]
> Найпростіше тестувати код, який **отримує** залежність параметром (`notify(results, send)`): у тесті передаєш `Mock()` — без жодного patch. Якщо ти пишеш хелпери для фреймворку, проєктуй їх так одразу.

## Не мокай усе

Mock відповідає так, як ти його налаштував, а не так, як справжній сервіс. Якщо API змінить формат, тести з моками лишаться зеленими. Тому моки — для unit-тестів логіки, а взаємодію зі справжнім API перевіряють окремими інтеграційними та API-тестами.

## Типові помилки

- Підміна в модулі-джерелі замість модуля, де функцію використовують (див. розбір).
- `send.called_once_with("x")` без `assert_` — це просто новий атрибут Mock, який завжди «істинний»: перевірка нічого не перевіряє.
- `return_value` там, де потрібна помилка: виняток задають через `side_effect`.
- Мокати сам код, який тестуєш, — тест перевіряє мок, а не продукт.

## Підсумок

- `monkeypatch.setattr / setenv / setitem` — тимчасова підміна з автоматичним відкатом.
- Підміняй ім'я в модулі, **де його шукають**.
- Фейк-функція дає відповідь і записує виклики.
- `Mock(return_value=..., side_effect=...)`, перевірки `assert_called_once_with`, `assert_not_called`, `call_count`.
- `patch` — контекстом або декоратором; найпростіше — передавати залежність параметром.
- Моки не замінюють інтеграційних тестів.
