# Наслідування і композиція

Є два способи побудувати клас з інших: **наслідування** («є різновидом», *is-a*) і **композиція** («містить», *has-a*). У тестових фреймворках трапляються обидва.

## Наслідування

```python
class BasePage:
    PATH = "/"

    def __init__(self, base_url):
        self.base_url = base_url

    def url(self):
        return self.base_url + self.PATH


class LoginPage(BasePage):           # LoginPage — різновид BasePage
    PATH = "/login"

    def login_button_text(self):
        return "Sign in"


page = LoginPage("https://shop.example.test")
page.url()                # 'https://shop.example.test/login' — метод з BasePage
```

`LoginPage` отримує всі атрибути й методи `BasePage` і додає свої. `PATH` перевизначено — і `url()` з базового класу бере значення підкласу, бо `self` — це `LoginPage`.

## Розбір: де Python шукає метод

Виклик `page.url()` для `page = LoginPage(...)`:

| Крок | Де шукає | Результат |
|---|---|---|
| 1 | у класі `LoginPage` | `url` немає |
| 2 | у батьківському `BasePage` | знайдено `url` — виконуємо |
| 3 | всередині `url`: `self.PATH` — знову з `LoginPage` | `"/login"` |

Пошук іде **від об'єкта вгору** по ланцюжку класів. Тому підклас може перевизначити будь-що, і навіть методи батька побачать нове значення.

## super() — викликати метод батька

```python
class AdminPage(BasePage):
    PATH = "/admin"

    def __init__(self, base_url, role):
        super().__init__(base_url)    # базова ініціалізація: self.base_url
        self.role = role
```

Якщо підклас має свій `__init__`, батьківський **не** викликається сам — забудеш `super().__init__(...)`, і `self.base_url` не буде.

## isinstance і підкласи

```python
isinstance(page, LoginPage)    # True
isinstance(page, BasePage)     # True — підклас теж є BasePage
issubclass(LoginPage, BasePage)  # True
```

## Ієрархії винятків

Найкорисніше наслідування в тестовому коді — власні винятки:

```python
class CheckoutError(Exception):
    def __init__(self, step, reason):
        super().__init__(f"{step}: {reason}")    # текст повідомлення
        self.step = step

class PaymentError(CheckoutError):
    pass

try:
    raise PaymentError("payment", "card declined")
except CheckoutError as e:          # ловить і PaymentError
    print(e, e.step)                # payment: card declined payment
```

`super().__init__(...)` передає текст у базовий `Exception` — тому `print(e)` і traceback показують зрозуміле повідомлення. `except CheckoutError` зловить і `PaymentError`, бо це різновид `CheckoutError`.

## Композиція

Композиція — коли об'єкт **містить** інші об'єкти:

```python
class OrdersApi:
    def __init__(self, session, base_url):
        self.session = session          # OrdersApi МІСТИТЬ сесію
        self.base_url = base_url

    def get_order(self, order_id):
        return self.session.get(f"{self.base_url}/orders/{order_id}")
```

Сесію не створюють усередині, а **передають ззовні** (dependency injection). У справжньому коді це HTTP-сесія, а в тесті — фейкова, що відповідає з заготовлених даних і записує запити. Клас не змінюється, а тест не залежить від мережі.

> [!QA]
> Правило «композиція важливіша за наслідування» добре працює і в автотестах. Сторінка, що **містить** компоненти (`Header`, `CartWidget`), гнучкіша за довгий ланцюжок `BasePage → ShopPage → ProductPage → ...`, де кожна зміна в базовому класі зачіпає все. Наслідування залиш для справжнього «є різновидом»: винятки, спільна база сторінок.

## Як обрати

| Питання | Відповідь |
|---|---|
| «X — це різновид Y?» (PaymentError — CheckoutError) | наслідування |
| «X містить / використовує Y?» (сторінка — хедер, клієнт — сесію) | композиція |

## Типові помилки

- Свій `__init__` у підкласі без `super().__init__(...)` — атрибути батька не створені, далі `AttributeError`.
- `super().__init__()` без потрібних аргументів — `TypeError: missing required positional argument`.
- `class PaymentError(CheckoutError)` перехоплений через `except PaymentError` **після** `except CheckoutError` — друга гілка ніколи не спрацює: спершу конкретніші класи.
- Створення залежності всередині класу (`self.session = RealSession()`) — такий клас неможливо протестувати з фейковою сесією.

## Підсумок

- `class Child(Parent)` — наслідування: отримує атрибути й методи батька, може перевизначати їх.
- Пошук методу йде від класу об'єкта вгору до батьків.
- Свій `__init__` у підкласі — виклич `super().__init__(...)`.
- `isinstance(obj, Parent)` — True і для підкласів; `except Parent` ловить нащадків.
- Композиція: об'єкт містить інші; залежності краще передавати в `__init__` — так їх легко підмінити в тестах.
