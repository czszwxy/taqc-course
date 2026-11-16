# Перевірка статусу, заголовків і JSON

Відповідь API — це три частини: **статус**, **заголовки** і **тіло**. Сильний API-тест перевіряє кожну з них настільки точно, наскільки дозволяють вимоги. Слабкий — лише «щось повернулося».

## Статус: точно, а не «ок»

```python
response = requests.get(f"{api}/products/3", timeout=TIMEOUT)
assert response.status_code == 200, response.text
```

Другий аргумент `assert` — повідомлення: якщо тест упаде, у звіті одразу буде тіло відповіді (часто там пояснення сервера). Для створення очікують `201`, для видалення — `204`, для помилок — конкретний 4xx із вимог.

## Заголовки

| Заголовок | Коли перевіряти | Приклад перевірки |
|---|---|---|
| `Content-Type` | відповідь має бути JSON | `assert response.headers["Content-Type"].startswith("application/json")` |
| `Location` | після `201 Created` — адреса нового ресурсу | `assert response.headers["Location"].endswith(f"/orders/{order_id}")` |
| `WWW-Authenticate` | разом із `401` — яку автентифікацію чекає сервер | `assert response.headers["WWW-Authenticate"] == "Bearer"` |
| `Allow` | разом із `405` — які методи дозволені | `assert response.headers["Allow"] == "GET"` |
| `X-Request-Id` | ідентифікатор запиту для пошуку в логах | `assert response.headers["X-Request-Id"]` |

Назви заголовків нечутливі до регістру: `headers["content-type"]` і `headers["Content-Type"]` — одне й те саме.

## Тіло JSON

```python
product = requests.get(f"{api}/products/3", timeout=TIMEOUT).json()

assert set(product) == {"id", "name", "category", "price", "rating", "inStock"}   # рівно ці поля
assert isinstance(product["price"], int)                                          # тип
assert product["name"] == "Mechanical Keyboard K8"                                # значення
```

| Що перевіряєш | Як |
|---|---|
| набір полів | `set(body) == {...}` — і відсутні, і зайві поля стануть помилкою |
| типи | `isinstance(body["price"], int)` |
| значення | `==` з очікуваним з вимог чи тестових даних |
| кожен елемент списку | `all(p["inStock"] for p in body["items"])` |
| порядок | порівняти список значень зі `sorted(...)` |

Повну перевірку структури зручніше описати моделлю — урок 3.

## Помилки — теж контракт

API Gadgetly повертає помилки однаково: статус 4xx/5xx і тіло `{"error": "…"}`. Негативний тест перевіряє обидва:

```python
response = requests.put(f"{api}/products", timeout=TIMEOUT)

assert response.status_code == 405
assert response.headers["Allow"] == "GET"
assert "not allowed" in response.json()["error"]
```

Типові негативні перевірки: без токена (`401`), чужий ресурс (`403`), невалідні дані (`400`), неіснуючий ресурс (`404`), неправильний метод (`405`), конфлікт стану (`409`), тіло не JSON (`415`), посилання на неіснуючий об'єкт (`422`).

> [!WARNING]
> Негативний тест, що **створює** дані, теж має прибирати за собою. Якщо через баг сервер прийняв невалідне замовлення (`201` замість `400`), тест упаде — але замовлення лишиться в базі й заважатиме іншим тестам. Тому спершу прибери створене, потім перевіряй.

```python
response = requests.post(f"{api}/orders", json=bad_order, headers=auth, timeout=TIMEOUT)
if response.status_code == 201:  # баг: прийняли — приберемо, щоб не залишати сміття
    requests.delete(f"{api}/orders/{response.json()['id']}", headers=auth, timeout=TIMEOUT)
assert response.status_code == 400, response.text
```

## Час відповіді

`assert response.elapsed.total_seconds() < 1` — простий «димовий» контроль швидкодії. Це не навантажувальне тестування, але різке сповільнення одного запиту воно помітить.

> [!QA]
> Негативних API-тестів зазвичай більше, ніж позитивних: «щасливий шлях» один, а способів надіслати неправильні дані — десятки. Саме там ховаються 500-ті помилки, витоки чужих даних і прийняті невалідні значення.

## Типові помилки

- `assert response.status_code != 500` — пропустить і 200 замість 400, і 404.
- `assert "error" in response.text` — знайде слово «error» будь-де, навіть у назві товару.
- Перевірка лише першого елемента списку замість кожного.
- `response.json()` на `204 No Content` — тіла немає, буде `JSONDecodeError`.
- Негативний тест, що лишає створені дані, коли сервер помилково їх прийняв.

## Підсумок

- Статус — точне значення з вимог; повідомлення `assert …, response.text` пришвидшує розслідування.
- Заголовки: `Content-Type`, `Location` після 201, `WWW-Authenticate` при 401, `Allow` при 405.
- Тіло: набір полів, типи, значення, властивість кожного елемента списку.
- Помилки — теж контракт: статус і текст `{"error": …}`.
- Тест, що створює дані, прибирає їх навіть тоді, коли сервер повів себе неправильно.
