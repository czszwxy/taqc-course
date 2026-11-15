# Підміна мережі: page.route

Сторінка показує дані з сервера. Як перевірити повідомлення «сервер недоступний», якщо сервер працює? Як перевірити порожній список, не видаляючи справжні замовлення? Playwright уміє **перехоплювати запити** браузера і відповідати замість сервера.

## Коли підміняти, а коли ні

| Підміна (mock) підходить | Справжній сервер потрібен |
|---|---|
| рідкісні стани: помилка 500, порожній список, дуже довга назва | перевірити, що дані справді зберігаються |
| стабільні дані для перевірки інтерфейсу | наскрізні сценарії: оформити замовлення від початку до кінця |
| сторонні сервіси: оплата, карти, аналітика | контракт API (модуль про API) |

> [!WARNING]
> Тест із підміною перевіряє **інтерфейс**, а не сервер. Якщо підмінити все, можна мати 100 зелених тестів і зламаний застосунок. Тримай частину тестів на справжньому сервері.

## page.route

На DevTools Lab кнопка **Load phones** запитує `GET /api/products?category=Phones…` і показує назви:

```python
def test_phones_from_a_stub(page: Page):
    page.route("**/api/products*", lambda route: route.fulfill(json={"items": [{"name": "Phone Test"}]}))
    page.goto("/playground/devtools")

    page.get_by_role("button", name="Load phones").click()

    expect(page.get_by_test_id("phones")).to_contain_text("Phone Test")
```

| Частина | Що означає |
|---|---|
| `"**/api/products*"` | шаблон адреси: `**` — будь-що перед, `*` — будь-що після (параметри `?category=…`) |
| `lambda route: ...` | обробник: викликається для кожного запиту, що підійшов під шаблон |
| `route.fulfill(json=...)` | відповісти замість сервера: статус 200, тіло — JSON |

Маршрут реєструють **до** дії, що надсилає запит. Якщо зареєструвати після — запит уже пішов на справжній сервер.

## Що може обробник

| Метод | Що робить |
|---|---|
| `route.fulfill(status=500, json={"error": "Server error"})` | відповідь з будь-яким статусом і тілом |
| `route.fulfill(body="…", headers={...})` | довільне тіло й заголовки |
| `route.abort()` | обірвати запит — «мережа недоступна» |
| `route.continue_(headers={...})` | пропустити на сервер, змінивши заголовки чи тіло |
| `route.fetch()` + `route.fulfill(response=..., json=...)` | отримати справжню відповідь і змінити її |

```python
def keep_one_phone(route):
    response = route.fetch()
    data = response.json()
    data["items"] = data["items"][:1]
    route.fulfill(response=response, json=data)


page.route("**/api/products*", keep_one_phone)
```

## Обробник зі станом

«Спершу помилка, потім усе гаразд» — обробник читає змінну, яку тест змінює:

```python
server = {"down": True}


def products(route):
    if server["down"]:
        route.fulfill(status=503, json={"error": "Maintenance"})
    else:
        route.fulfill(json={"items": [{"name": "Phone Test"}]})


page.route("**/api/products*", products)
...
server["down"] = False
```

Словник замість простої змінної — бо функція змінює не саму змінну, а значення всередині (згадай замикання з модуля про функції).

> [!NOTE]
> У режимі розробки React запускає завантаження даних двічі, тож обробник може викликатися двічі на один клік. Не рахуй виклики — керуй відповіддю через стан, як вище.

## Перевірити, що сторінка надсилає

Інколи баг не у відповіді, а в запиті: не той параметр, не те тіло. `expect_request` чекає на запит, який станеться під час блоку `with`:

```python
from urllib.parse import parse_qs, urlparse

with page.expect_request("**/api/products*") as request_info:
    page.get_by_role("button", name="Load phones").click()
request = request_info.value

assert request.method == "GET"
assert parse_qs(urlparse(request.url).query)["category"] == ["Phones"]
```

| Властивість `Request` | Що дає |
|---|---|
| `.method`, `.url` | метод і повна адреса |
| `.headers` | заголовки (назви в нижньому регістрі: `authorization`) |
| `.post_data_json` | тіло запиту як словник |

`expect_request` приймає шаблон адреси або функцію-умову: `lambda r: "/lab/profile" in r.url and r.method == "POST"`. `expect_response` працює так само для відповідей: `.status`, `.json()`.

## Типові помилки

| Помилка | Що станеться |
|---|---|
| `page.route(...)` після кліку | запит уже пішов на сервер — підміна не спрацює |
| шаблон `"/api/orders"` без `**` | не збігається з повною адресою `http://localhost:5173/api/orders` |
| обробник не викликав ні `fulfill`, ні `continue_`, ні `abort` | запит «зависає», сторінка чекає до timeout |
| підмінені всі запити | тести перевіряють лише самих себе |
| `assert` над запитом без `expect_request` | запиту ще немає, або перевіряється не той |

## Підсумок

- `page.route(шаблон, обробник)` перехоплює запити; реєструй до дії, що їх викликає.
- `fulfill` — відповісти замість сервера, `abort` — обірвати, `continue_` — пропустити зі змінами, `fetch` — змінити справжню відповідь.
- Стан обробника (словник) дозволяє моделювати «спершу помилка, потім успіх».
- `expect_request` / `expect_response` перевіряють, що сторінка надіслала і що отримала.
- Підміна тестує інтерфейс; частина тестів має йти на справжній сервер.
