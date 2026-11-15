# Діалоги, фрейми й нові вкладки

Більшість сторінок — це один документ в одній вкладці. Але є три речі, які звичайні локатори не бачать: **діалоги браузера** (alert, confirm, prompt), **iframe** (сторінка всередині сторінки) і **нові вкладки**. Для кожної Playwright має окремий інструмент.

## Діалоги

| Діалог | Що бачить користувач | Як відповісти в тесті |
|---|---|---|
| `alert` | повідомлення і кнопка OK | `dialog.accept()` |
| `confirm` | питання, OK / Cancel | `dialog.accept()` або `dialog.dismiss()` |
| `prompt` | питання і поле вводу | `dialog.accept("текст")` або `dialog.dismiss()` |

> [!IMPORTANT]
> Якщо обробника немає, Playwright **сам закриває** діалог (як Cancel). Тест на «Delete project? → OK» без обробника тихо натисне Cancel — і перевірятиме зовсім інший сценарій.

Обробник реєструють **до** дії, що відкриває діалог:

```python
page.once("dialog", lambda dialog: dialog.accept())
page.get_by_role("button", name="Delete project").click()
```

`page.once` спрацьовує на **наступний** діалог, `page.on` — на кожен. Властивості діалогу: `dialog.type` (`"alert"`, `"confirm"`, `"prompt"`), `dialog.message`, `dialog.default_value`.

Щоб перевірити тексти діалогів, обробник записує їх у список, а тест перевіряє список після наступної перевірки сторінки:

```python
messages = []

def answer(dialog):
    messages.append(f"{dialog.type}: {dialog.message}")
    if dialog.type == "prompt":
        dialog.accept("Release 2.0")
    else:
        dialog.accept()

page.on("dialog", answer)
page.get_by_role("button", name="Rename project").click()

expect(page.get_by_test_id("project-name")).to_have_text("Release 2.0")
assert messages == ["prompt: New project name", "alert: Project renamed"]
```

> [!NOTE]
> У синхронному API обробники подій виконуються, поки Playwright чекає на щось (дію, перевірку). Тому список перевіряють **після** `expect(...)`, а не одразу після `click()`.

## Фрейми

Вміст `<iframe>` — окремий документ: `page.get_by_label("Card number")` його не бачить. Спершу знаходять фрейм, потім шукають усередині:

```python
payment = page.frame_locator('iframe[title="Payment"]')
payment.get_by_label("Card number").fill("4242 4242 4242 4242")
payment.get_by_role("button", name="Pay").click()
```

Або через локатор самого iframe: `page.get_by_title("Payment").content_frame` — той самий результат. Локатори всередині фрейму працюють як звичайні: з автоочікуванням і `expect`.

## Нові вкладки

Посилання з `target="_blank"` відкривають нову вкладку (popup). Її «ловлять» менеджером контексту:

```python
with page.expect_popup() as popup_info:
    page.get_by_role("link", name="Open invoice").click()
invoice = popup_info.value

expect(invoice.get_by_role("heading", name="Invoice #1002")).to_be_visible(timeout=10_000)
expect(page.get_by_role("heading", name="Orders")).to_be_visible()
```

| Рядок | Що відбувається |
|---|---|
| `with page.expect_popup() as popup_info:` | «підписка» на нову вкладку **до** кліку |
| клік усередині `with` | вкладка відкривається |
| `popup_info.value` | об'єкт `Page` нової вкладки — з ним працюють як зі звичайною сторінкою |
| `timeout=10_000` у першій перевірці | нова вкладка завантажує сторінку з нуля — дай їй більше часу |
| перевірка `page` | перша вкладка теж лишилася відкритою |

Якщо нова сторінка має відкритися **в тій самій** вкладці, `expect_popup` чекатиме до timeout — і тест упаде. Це теж перевірка вимоги.

## Завантаження файлів

```python
with page.expect_download() as download_info:
    page.get_by_role("button", name="Export CSV").click()
download = download_info.value

assert download.suggested_filename == "orders.csv"
download.save_as(tmp_path / download.suggested_filename)
```

> [!QA]
> Діалоги, фрейми й нові вкладки — улюблені місця багів: Cancel, що все одно видаляє; порожній prompt, що зберігає порожнє ім'я; посилання, що відкривається не там. Звичайний клік-тест їх не помітить, тому для кожного такого елемента пиши окремий тест на «негативну» відповідь.

## Типові помилки

| Помилка | Що станеться |
|---|---|
| обробник діалогу зареєстровано після кліку | діалог уже закрито автоматично (Cancel) |
| `page.on("dialog", ...)` для одного діалогу, а потім ще один діалог | обробник спрацює і на другий — інколи це не те, що треба (`once`) |
| `page.get_by_label(...)` для поля всередині iframe | елемент не знайдено — шукай через `frame_locator` |
| клік по посиланню без `expect_popup`, потім пошук на `page` | тест шукає вміст нової вкладки в старій |
| перевірка списку діалогів одразу після `click()` | список ще може бути неповним |

## Підсумок

- Діалоги без обробника закриваються автоматично; реєструй `page.once` / `page.on("dialog", ...)` до кліку.
- `accept()`, `accept("текст")`, `dismiss()`; тексти — `dialog.type`, `dialog.message`.
- Вміст iframe — через `page.frame_locator(...)` або `.content_frame`.
- Нова вкладка — `with page.expect_popup() as popup_info:`; файл — `expect_download`.
- Для кожного такого елемента тестуй і «позитивну», і «негативну» відповідь.
