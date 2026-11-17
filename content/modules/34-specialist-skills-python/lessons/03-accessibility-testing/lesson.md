# Тестування доступності (accessibility, a11y)

Доступний сайт — той, яким можна користуватися **без миші**, **без зору**, з поганим зором або тремтінням рук. За оцінкою ВООЗ, значну інвалідність має приблизно кожна шоста людина у світі. До того ж доступність потрібна всім: розбита мишка, яскраве сонце на екрані, дитина на руках — і ти вже «користувач з обмеженнями». У багатьох країнах доступність — вимога закону (в ЄС з червня 2025 року застосовується European Accessibility Act), тому компанії дедалі частіше шукають QA, які вміють її перевіряти.

> [!QA]
> Автоматизатор уже наполовину тестує доступність: локатор `page.get_by_role("button", name="Subscribe")` шукає елемент так само, як це робить скрінрідер. Якщо такий локатор «не знаходить» кнопку — можливо, це не проблема тесту, а дефект доступності.

## WCAG за дві хвилини

**WCAG** (Web Content Accessibility Guidelines) — стандарт W3C; актуальна версія — 2.2. Чотири принципи (**POUR**):

| Принцип | Питання | Приклад вимоги |
|---|---|---|
| **P**erceivable | чи можна сприйняти вміст? | alt для зображень, контраст тексту |
| **O**perable | чи можна керувати? | усе працює з клавіатури, видно фокус |
| **U**nderstandable | чи зрозуміло? | підписи полів, зрозумілі помилки |
| **R**obust | чи розуміють це допоміжні технології? | правильні ролі й назви елементів |

Рівні відповідності: **A** (мінімум), **AA** (те, чого зазвичай вимагають), **AAA** (найвищий). На практиці мета — «WCAG 2.x AA».

## Що перевіряти руками

| Перевірка | Як | Типовий дефект |
|---|---|---|
| Клавіатура | `Tab` / `Shift+Tab` по всій сторінці, `Enter`, `Space`, `Esc` | до елемента не дістатися; «кнопка» — це `div` |
| Видимий фокус | чи видно, де ти зараз | рамку фокуса прибрали стилями |
| Назви й підписи | DevTools → Elements → Accessibility: Name і Role | кнопка-іконка без назви; поле без `label` |
| Зображення | є `alt`, і він описує суть | `alt` відсутній або `image123.png` |
| Контраст | DevTools показує коефіцієнт у вибиральнику кольору | сірий текст на білому (потрібно ≥ 4.5:1) |
| Помилки форм | чи оголошується помилка і чи пов'язана з полем | червоний текст без `role="alert"` |
| Діалоги | фокус усередині, `Esc` закриває, фокус повертається | фокус лишається під діалогом |
| Масштаб | 200 % — нічого не зникає | текст обрізається |

Скрінрідери для перевірки «на слух»: NVDA (Windows, безкоштовний), VoiceOver (macOS, iOS), TalkBack (Android).

## Автоматичний скан: axe-core з Python

**axe-core** — рушій з правилами WCAG (JavaScript). У Python його запускає пакет **axe-playwright-python**: він вставляє axe у відкриту сторінку і повертає результат як словник.

```bash
pip install axe-playwright-python
```

```python
from axe_playwright_python.sync_playwright import Axe
from playwright.sync_api import Page, expect

WCAG_A_AA = {"runOnly": {"type": "tag", "values": ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]}}


def test_settings_page_has_no_detectable_violations(page: Page):
    page.goto("/settings")
    expect(page.get_by_role("heading", name="Settings")).to_be_visible()

    results = Axe().run(page, options=WCAG_A_AA)

    rule_ids = [violation["id"] for violation in results.response["violations"]]
    assert rule_ids == [], results.generate_report()
```

| Запис | Навіщо |
|---|---|
| `expect(...).to_be_visible()` перед сканом | сканувати вже готову сторінку, а не порожню заготовку |
| `Axe().run(page, options=...)` | запуск; `options` — це опції самого axe-core |
| `{"runOnly": {"type": "tag", "values": [...]}}` | лише правила WCAG рівнів A і AA |
| `context="#checkout"` | сканувати частину сторінки |
| `context={"exclude": [["#third-party-widget"]]}` | пропустити чужий віджет (разом з усім, що всередині) |
| `{"rules": {"color-contrast": {"enabled": False}}}` | тимчасово вимкнути правило з відомою проблемою |

## Розбір: як читати порушення

`results.response` — словник, який повернув axe-core. Кожен елемент `results.response["violations"]`:

| Ключ | Приклад | Що означає |
|---|---|---|
| `"id"` | `button-name` | правило; за ним шукають документацію |
| `"impact"` | `critical` | серйозність: minor, moderate, serious, critical |
| `"help"` | `Buttons must have discernible text` | коротко, що не так |
| `"helpUrl"` | посилання на сторінку правила | як виправити |
| `"nodes"` → `"target"` | `['.icon-btn']` | які саме елементи |

Помічники бібліотеки: `results.violations_count` — кількість порушень, `results.generate_report()` — читабельний текст з елементами й поясненнями. Порівнюй список ідентифікаторів з `[]`, а звіт передай другим аргументом `assert` — тоді у звіті pytest буде і короткий список правил, і деталі.

## Чого скан не знайде

Автоматика бачить **розмітку**, але не **досвід**. Вона знайде відсутній `alt`, поле без підпису, кнопку без назви, слабкий контраст. Вона **не** знайде: `div` з обробником кліку замість кнопки, діалог, що не забирає фокус, `Esc`, який нічого не робить, безглуздий `alt="image"`, неправильний порядок Tab. Тому скан — це перший фільтр, а не вся перевірка.

## Перевірки ролей, назв і клавіатури в Playwright

```python
def test_filters_panel_works_from_the_keyboard(page: Page):
    page.goto("/catalog")
    toggle = page.get_by_role("button", name="Filters")

    toggle.focus()
    page.keyboard.press("Enter")

    expect(toggle).to_have_attribute("aria-expanded", "true")
    expect(page.get_by_role("region", name="Filters")).to_be_visible()
```

| Перевірка | Що доводить |
|---|---|
| `get_by_role(..., name=...)` знаходить елемент | у нього правильні роль і назва |
| `expect(locator).to_have_accessible_name("…")` | назва для скрінрідера |
| `expect(locator).to_have_accessible_description("…")` | опис (наприклад, текст помилки через `aria-describedby`) |
| `expect(locator).to_have_role("button")` | роль |
| `expect(locator).to_be_focused()` | де зараз фокус |
| `page.keyboard.press("Tab" / "Enter" / "Escape")` | сценарій без миші |

## Aria-снапшот

`to_match_aria_snapshot` порівнює **дерево доступності** фрагмента сторінки із шаблоном у YAML — це «скріншот для скрінрідера»:

```python
expect(page.get_by_role("navigation")).to_match_aria_snapshot("""
  - navigation:
    - link "Home"
    - link "Catalog"
    - button "Cart"
""")
```

Шаблон частковий: можна не вказувати атрибути чи назви. Поточне дерево показує `print(locator.aria_snapshot())` або вкладка Aria snapshot у Codegen.

## Типові помилки

- «Скан зелений — отже, доступно»: скан не натискає `Tab` і `Esc`.
- Скан одразу після `goto`, поки сторінка ще не намалювала вміст: axe перевіряє порожнечу і звітує «0 порушень».
- `exclude` для всього, що падає, — проблеми ховаються замість виправлення.
- Перевірка доступності лише на початковому стані сторінки: помилки форм і діалоги з'являються після дій.
- Локатори через `data-testid` всюди — тести не помічають, що кнопка втратила назву.
- Доступність «наприкінці проєкту»: дешевше перевіряти в кожній задачі.

## Підсумок

- Доступність = сприйняти, керувати, зрозуміти, сумісність (POUR); мета — WCAG 2.x AA.
- Руками: клавіатура, фокус, назви й ролі, alt, контраст 4.5:1, помилки, діалоги.
- axe-playwright-python: `Axe().run(page, options=...)` → список `results.response["violations"]` має бути порожнім.
- Скан знаходить лише частину дефектів; клавіатуру й фокус перевіряють окремими тестами.
- `get_by_role`, `to_have_accessible_name`, `to_be_focused`, `to_match_aria_snapshot` — доступність у звичайних тестах.
