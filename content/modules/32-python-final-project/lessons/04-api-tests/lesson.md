# API-тести на Python

Гроші й межі цієї системи рахує сервер, тож **основа** регресії — API-тести: вони швидкі, точні й покривають усі комбінації за секунди. UI-тести потім перевіряють, що сторінка показує саме те, що порахував сервер.

## Клієнт returns API

```python
REFUND_BODY = {"orderId": 5001, "email": "anna.koval@example.test", "items": [{"lineId": 1, "quantity": 1}],
               "reason": "changed-mind", "condition": "unopened", "refundMethod": "original"}


def quote(api, **overrides):
    return requests.post(f"{api}/returns/quote", json={**REFUND_BODY, **overrides}, timeout=TIMEOUT)
```

Тіло за замовчуванням + `**overrides` — кожен тест змінює лише те, що перевіряє: `quote(api, condition="opened")`, `quote(api, items=[{"lineId": 3, "quantity": 1}])`. У репозиторії це був би клас `ReturnsApi` з методами `quote()`, `create()`, `get()`, `cancel()`.

## Модель відповіді з перевіркою «сума сходиться»

```python
class ReturnQuote(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    reason: Literal["defective", "wrong-item", "damaged", "changed-mind"]
    itemsValue: int
    restockingFee: int
    returnShipping: int
    storeCreditBonus: int
    refund: int
    ...

    @model_validator(mode="after")
    def refund_adds_up(self):
        expected = self.itemsValue - self.restockingFee - self.returnShipping + self.storeCreditBonus
        assert self.refund == expected, f"refund {self.refund} != {expected}"
        return self
```

Модель ловить «зламаний контракт» (поле зникло, тип змінився) і внутрішню неузгодженість (сума не дорівнює складовим). Але **чи правильні самі складові** — вирішує таблиця рішень.

## Таблиця рішень як параметризований тест

Кожен рядок таблиці з уроку 2 — один набір параметрів:

```python
@pytest.mark.parametrize(
    "reason, condition, method, fee, shipping, bonus, refund",
    [
        ("changed-mind", "unopened", "original", 0, 90, 0, 2909),
        ...
    ],
)
```

Перевіряй **кожну** складову, а не лише `refund`: так у звіті одразу видно, яке правило зламалося — комісія, доставка чи бонус.

## Негативні сценарії

| Запит | Очікування |
|---|---|
| кількість більша за куплену | 400 |
| подарункова картка | 422, «Gift cards cannot be returned» |
| замовлення поза вікном | 422, «Return window closed…» |
| не доставлене замовлення | 409 |
| чужий email при відстеженні | 404 |

Ці перевірки мають бути **на рівні API**: сторінка не дає їх відтворити, але будь-який інший клієнт (мобільний застосунок, скрипт) — дає.

## API + UI

```python
@pytest.fixture
def created_return(api):
    response = requests.post(f"{api}/returns", json={**REFUND_BODY, "comment": None}, timeout=TIMEOUT)
    assert response.status_code == 201, response.text
    created = response.json()
    yield created
    requests.delete(f"{api}/returns/{created['id']}", params={"email": created["email"]}, timeout=TIMEOUT)
```

Два корисні типи комбінованих тестів:

- **створити через API → перевірити в UI**: відстеження показує повернення з правильним email і не показує з чужим;
- **підсумок сторінки = відповідь API**: сторінка після змін показує ту саму суму, що повертає `POST /returns/quote` для тих самих параметрів — так ловиться «сторінка не перерахувала».

## Підсумок

- API — основа регресії для грошей і меж; UI перевіряє показ.
- Клієнт з тілом за замовчуванням і `**overrides`; кожен запит з `timeout`.
- Pydantic-модель: контракт + «сума сходиться»; складові перевіряє таблиця рішень.
- Негативні сценарії — на рівні API: кількість, подарункова картка, вікно, доступ.
- Комбіновані тести з прибиранням: API → UI і «сторінка = API».
