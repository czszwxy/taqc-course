# Контракт відповіді з pydantic

Перевіряти кожне поле окремим `assert` довго, і легко щось пропустити: новий зайвий ключ, число, що прийшло рядком, статус з великої літери. Краще один раз описати **контракт** — які поля є, яких вони типів і які значення допустимі, — а потім перевіряти кожну відповідь одним рядком. У Python для цього найчастіше беруть **pydantic**.

> [!QA]
> Контрактні перевірки ловлять баги, яких не видно в UI: фронтенд може «проковтнути» `"499"` замість `499` чи зайве поле, а мобільний застосунок на тому самому API — впасти. Тому API-контракт перевіряють окремо від інтерфейсу.

## Модель

```python
from pydantic import BaseModel, ConfigDict, Field


class Product(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: int
    name: str
    category: str
    price: int = Field(gt=0)
    rating: float
    inStock: bool
```

```python
body = requests.get(f"{api}/products/5", timeout=TIMEOUT).json()
product = Product.model_validate(body)   # якщо контракт порушено — ValidationError
assert product.price == 32999            # далі — звичайні атрибути
```

Назви полів збігаються з ключами JSON (`inStock`), тому модель читається як документація відповіді.

## Що ловить кожна частина моделі

| Частина моделі | Ловить | Повідомлення pydantic |
|---|---|---|
| поле без значення за замовчуванням | поле зникло з відповіді | `price — Field required` |
| тип `int` + `strict=True` | число прийшло рядком: `"5"` | `id — Input should be a valid integer` |
| `extra="forbid"` | зайве поле: `discount` | `discount — Extra inputs are not permitted` |
| `Field(gt=0)` | значення поза межами: `price = 0` | `price — Input should be greater than 0` |
| `Literal["created", "paid"]` | невідоме значення: `"Shipped"` | `Input should be 'created' or 'paid'` |

Без `strict=True` pydantic «допомагає» і перетворює `"5"` на `5` — для звичайного застосунку це зручно, але тест мав би таке помітити. Для `float` ціле число дозволене й у strict-режимі: `4` → `4.0`.

## Розбір: як читати ValidationError

```text
1 validation error for Product
price
  Input should be greater than 0 [type=greater_than, input_value=0, input_type=int]
```

| Рядок | Що означає |
|---|---|
| `1 validation error for Product` | скільки порушень і в якій моделі |
| `price` | шлях до поля (для вкладених — `user.email`, для списків — `3.price`) |
| `Input should be greater than 0` | яке правило порушено |
| `input_value=0` | що насправді прийшло |

pytest показує цей текст у звіті, тож упалий тест одразу пояснює, яке поле зламалося.

## Списки й вкладені моделі

```python
from pydantic import TypeAdapter

body = requests.get(f"{api}/products", params={"limit": 50}, timeout=TIMEOUT).json()
products = TypeAdapter(list[Product]).validate_python(body["items"])
```

`TypeAdapter` перевіряє тип, який не є моделлю: список, словник. Для вкладеного об'єкта поле моделі має тип іншої моделі: `owner: User`.

## Бізнес-правила: model_validator

Типи не скажуть, що сума порахована неправильно. Для правил між полями є валідатор усієї моделі:

```python
from pydantic import model_validator


class Invoice(BaseModel):
    net: int
    vat: int
    gross: int

    @model_validator(mode="after")
    def gross_is_net_plus_vat(self):
        if self.gross != self.net + self.vat:
            raise ValueError(f"gross {self.gross} != {self.net} + {self.vat}")
        return self
```

`mode="after"` — валідатор запускається, коли всі поля вже перевірені й мають правильні типи. Він має повернути `self`.

## Де тримати моделі

Моделі — спільний код для багатьох тестів: у проєкті їх кладуть у `models.py` (чи `api/models.py`) і імпортують у тести. У задачах курсу модель і тести в одному файлі.

## Типові помилки

- Модель без `extra="forbid"` мовчки пропускає нові поля — зокрема ті, що випадково віддають внутрішні дані.
- Без `strict=True` тест не помітить `"499"` замість `499`.
- `Product(**body)` замість `Product.model_validate(body)` — працює, але повідомлення гірші для словників з неправильними ключами.
- Валідатор, що забув `return self`, — модель стає `None`.
- Опис моделі «під поточну відповідь» замість вимог: тоді модель закріплює баг як норму.

## Підсумок

- Модель pydantic = контракт відповіді: поля, типи, межі, допустимі значення.
- `model_validate(body)` перевіряє все одразу; `ValidationError` показує поле, правило і фактичне значення.
- `extra="forbid"` і `strict=True` роблять перевірку суворою.
- `TypeAdapter(list[Model])` — для списків; вкладені моделі — для вкладених об'єктів.
- Правила між полями — `@model_validator(mode="after")`.
