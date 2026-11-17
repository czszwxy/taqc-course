# Локатори

Щоб натиснути кнопку чи перевірити текст, тест спершу має **знайти** елемент. Опис того, як його знайти, називається **локатором**. Добрий локатор шукає елемент так, як його шукає людина: «кнопка Add to cart», «поле Email», «заголовок My tasks». Такий тест переживе редизайн: розробники поміняють класи, обгортки й порядок блоків, а кнопка з тим самим написом лишиться.

## Вбудовані локатори

| Локатор | Знаходить | Приклад |
|---|---|---|
| `get_by_role(role, name=...)` | елемент за роллю і доступним ім'ям | `page.get_by_role("button", name="Clear filters")` |
| `get_by_label(text)` | поле форми за підписом `<label>` | `page.get_by_label("Max price")` |
| `get_by_placeholder(text)` | поле за підказкою всередині | `page.get_by_placeholder("What needs to be done?")` |
| `get_by_text(text)` | елемент з таким текстом | `page.get_by_text("Out of stock")` |
| `get_by_alt_text(text)` | картинку за `alt` | `page.get_by_alt_text("Gadgetly logo")` |
| `get_by_title(text)` | елемент за атрибутом `title` | `page.get_by_title("Remove item")` |
| `get_by_test_id(id)` | елемент з `data-testid="id"` | `page.get_by_test_id("result-count")` |

Порядок вибору: **роль → підпис → placeholder → текст → test id → CSS**. Роль і підпис — те, що бачить і чує користувач (зокрема з екранним диктором). `data-testid` — домовленість із розробниками: невидима, зате стабільна. CSS і XPath — коли нічого іншого немає.

## get_by_role і доступне ім'я

| Елемент на сторінці | Роль |
|---|---|
| `<button>`, `<input type="submit">` | `button` |
| `<a href>` | `link` |
| `<h1>`…`<h6>` | `heading` |
| `<input type="text">`, `<textarea>` | `textbox` |
| `<input type="checkbox">` | `checkbox` |
| `<select>` | `combobox` |
| `<li>` | `listitem` |
| повідомлення з `role="alert"` | `alert` |

`name` — **доступне ім'я** елемента: текст кнопки чи посилання, підпис поля, `aria-label`. У списку справ кнопка видалення показує лише «×», але має `aria-label="Delete “Buy coffee”"` — тому її знаходить `get_by_role("button", name="Delete “Buy coffee”")`.

## Частковий і точний збіг

За замовчуванням `name` і текст порівнюються **частково і без урахування регістру**:

```python
page.get_by_role("button", name="add to cart")            # знайде "Add to cart"
page.get_by_text("mouse")                                 # будь-який текст, де є "mouse"
page.get_by_role("heading", name="My tasks", exact=True)  # лише рівно "My tasks"
page.get_by_text(re.compile(r"^\d+ products found$"))     # регулярний вираз (import re)
```

## Strict mode

Дія вимагає, щоб локатор знайшов **рівно один** елемент. У списку справ три кнопки Edit:

```python
page.get_by_role("button", name="Edit").click()
```

```text
Error: strict mode violation: get_by_role("button", name="Edit") resolved to 3 elements
```

Playwright не вгадує, яку з трьох ти мав(ла) на увазі: краще впасти, ніж натиснути не те. Рішення — уточнити локатор.

## Ланцюжки і filter

```python
coffee = page.get_by_test_id("todo-item").filter(has_text="Buy coffee")
coffee.get_by_role("button", name="Edit").click()
```

| Крок | Що знаходить локатор |
|---|---|
| `page.get_by_test_id("todo-item")` | усі 3 рядки списку |
| `.filter(has_text="Buy coffee")` | лише рядок, у якому є цей текст |
| `.get_by_role("button", name="Edit")` | кнопку Edit **всередині** цього рядка — рівно одну |

Інші способи звузити пошук:

| Метод | Що робить |
|---|---|
| `.filter(has_text="…")` / `.filter(has_not_text="…")` | залишає елементи з текстом / без нього |
| `.filter(has=page.get_by_role("button", name="Add to cart"))` | залишає елементи, всередині яких є такий елемент |
| `.first`, `.last`, `.nth(2)` | перший, останній, третій (нумерація з 0) |
| `locator.get_by_...(...)` | шукає лише всередині знайденого елемента |

```python
cards = page.get_by_test_id("results").get_by_role("listitem")
out_of_stock = cards.filter(has_text="Out of stock")
first_card = cards.first
```

> [!WARNING]
> `.nth()` і `.first` прив'язують тест до **порядку** елементів. Використовуй їх, коли порядок і є вимогою (сортування), а не щоб обійти strict mode. Інакше після зміни порядку тест натисне не той елемент.

## CSS і XPath

```python
page.locator("#promo")                         # CSS: id
page.locator("[data-testid=results] li")       # CSS: атрибут і вкладеність
page.locator("xpath=//ul/li[3]")               # XPath
```

Такі локатори описують **верстку**, а не те, що бачить користувач. Клас `.bg-teal-600` зміниться разом із кольором кнопки, `li[3]` — коли додадуть ще один товар.

## Як дізнатися роль і ім'я

- DevTools → вкладка **Accessibility** показує роль і ім'я вибраного елемента.
- Повідомлення про strict mode перелічує всі знайдені елементи з готовими локаторами для кожного.
- Codegen та Inspector мають режим **Pick locator**: наводиш мишкою — бачиш локатор (урок 7).

> [!QA]
> Якщо кнопку не вдається знайти через `get_by_role`, бо в неї немає ні тексту, ні `aria-label`, її не «побачить» і екранний диктор. Це не лише незручність для тесту, а й дефект доступності, про який варто написати баг-репорт.

## Типові помилки

- Шукати поле за текстом поруч (`get_by_text("Email")`) замість `get_by_label("Email")`: текст знайдеться, але `fill` у нього не ввести.
- Забути `exact=True`, коли один підпис є частиною іншого: `get_by_label("Password")` знайде і «Password», і «Confirm password».
- Обходити strict mode через `.first` замість того, щоб уточнити, *який саме* елемент потрібен.
- Копіювати з DevTools довгий CSS-селектор `#root > div > main > ...`.

## Підсумок

- Локатор — опис елемента; найкращі описують його так, як бачить користувач: `get_by_role`, `get_by_label`, `get_by_placeholder`, `get_by_text`.
- `get_by_test_id` — стабільний запасний варіант, CSS і XPath — останній.
- Збіг за замовчуванням частковий і без регістру; `exact=True` або регулярний вираз роблять його точним.
- Дії вимагають рівно одного елемента (strict mode); звужуй пошук ланцюжками і `filter`.
