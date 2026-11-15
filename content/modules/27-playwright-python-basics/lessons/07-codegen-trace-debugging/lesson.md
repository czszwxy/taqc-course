# Codegen, Trace Viewer і налагодження

Тести падають — це їхня робота. Важливо інше: як швидко ти зрозумієш, **чому** тест упав: баг у застосунку, помилка в тесті чи нестабільність. Playwright дає для цього інструменти: запис дій (Codegen), покрокове виконання (Inspector) і повний запис прогону (Trace Viewer).

## Codegen: записати чернетку

```bash
playwright codegen --target python-pytest http://localhost:5173/playground/search
```

У лабораторії курсу: `npm run lab:py-codegen -- http://localhost:5173/playground/search`. Відкриються браузер і вікно Inspector: ти клацаєш і вводиш — Codegen пише код. Кнопки панелі: **Record** (запис), **Pick locator** (навести на елемент — побачити локатор), **Assert visibility / text / value** (додати перевірку).

Типова чернетка:

```python
import re
from playwright.sync_api import Page, expect


def test_example(page: Page) -> None:
    page.goto("http://localhost:5173/playground/search")
    page.get_by_label("Search").click()
    page.get_by_label("Search").fill("keyboard")
    expect(page.get_by_test_id("results")).to_contain_text("Mechanical Keyboard K8")
```

Що виправити, перш ніж комітити:

| У чернетці | Як краще |
|---|---|
| `test_example` | назва про вимогу: `test_search_finds_keyboard` |
| повна адреса `http://localhost:5173/...` | відносна, з `--base-url` |
| `click()` перед `fill()` | зайвий: `fill` сам фокусує поле |
| перевірки лише того, що ти встиг клацнути | перевірки з вимог: кількість, лічильник, відсутність зайвого |
| повтор однакових кроків у кожному тесті | хелпер-функція або фікстура |

Codegen добре знаходить локатори, але **не знає вимог**. Що перевіряти, вирішуєш ти.

## Як читати помилку

```text
AssertionError: Locator expected to have text '2 products found'
Actual value: 3 products found
Call log:
  - Expect "to_have_text" with timeout 5000ms
  - waiting for get_by_test_id("result-count")
    9 × locator resolved to <p data-testid="result-count">3 products found</p>
      - unexpected value "3 products found"
```

| Частина | Що каже |
|---|---|
| `AssertionError: Locator expected to have text …` | яка перевірка не справдилась і що очікували |
| `Actual value: …` | що було насправді — головне для рішення «баг чи тест» |
| `Call log` | що Playwright робив: знайшов елемент 9 разів, значення не змінилось |
| рядок тесту у traceback | де саме впало |

Ще два типові повідомлення:

- `TimeoutError: Locator.click: Timeout 5000ms exceeded … waiting for get_by_role("button", name="Login")` — елемент не знайдено: перевір текст кнопки, роль, чи не з'являється він пізніше чи в іншому місці.
- `strict mode violation: … resolved to 2 elements` — локатор знайшов кілька елементів; повідомлення перелічує їх із готовими локаторами.

## Подивитися очима

- `pytest --headed --slowmo 500 -k search` — повільно, з вікном, лише потрібний тест.
- `page.pause()` у тесті + `--headed` — тест зупиняється і відкривається **Inspector**: можна йти по кроках (Step over), пробувати локатори (Pick locator), продовжити (Resume).
- Змінна `PWDEBUG=1` запускає тести з Inspector з першого кроку: у PowerShell `$env:PWDEBUG = "1"; pytest -k search` (у bash `PWDEBUG=1 pytest -k search`).

> [!WARNING]
> Прибери `page.pause()` перед комітом. У headed-режимі тест зупиниться й чекатиме, поки хтось натисне Resume.

## Trace Viewer: запис усього прогону

```bash
pytest --tracing retain-on-failure
playwright show-trace test-results/<папка-тесту>/trace.zip
```

`retain-on-failure` записує трейс кожного тесту, але зберігає лише ті, що впали. Файл лежить у `test-results/<назва-тесту>/trace.zip`; у лабораторії: `npm run lab:py -- --tracing retain-on-failure`, потім `npm run lab:py-trace -- test-results/<папка>/trace.zip`. Ще один спосіб — перетягнути файл на trace.playwright.dev: трейс відкривається прямо у твоєму браузері.

| Що є в трейсі | Навіщо |
|---|---|
| список дій із часом | який крок упав і скільки чекав |
| знімки сторінки **до** і **після** кожної дії | що бачив користувач у момент падіння |
| консоль браузера | помилки JavaScript |
| мережа | запити, статуси, тіла відповідей |
| код тесту | рядок, що виконувався |

Трейс — найкращий інструмент для падінь на CI: там немає вікна, а з трейсом можна «переграти» прогін кадр за кадром.

## Скріншоти й відео

- `pytest --screenshot only-on-failure` — знімок екрана для кожного впалого тесту.
- `pytest --video retain-on-failure` — відео впалих тестів.
- `page.screenshot(path="cart.png", full_page=True)` — знімок у будь-який момент тесту.

> [!QA]
> Трейс, скріншот і відео — готові вкладення до баг-репорту: розробник бачить кроки, стан сторінки й мережеві запити і не перепитує «а як відтворити?».

## Алгоритм розслідування

Спершу прочитай повідомлення: очікуване, `Actual value`, рядок тесту. Далі подивись трейс (або відтвори локально з `--headed`) і знайди крок, де сторінка відрізнялась від очікувань. Потім звір із вимогами: якщо сторінка поводиться не за вимогами — це баг, пиши репорт із трейсом. Якщо помилився тест (неправильний текст, локатор, очікування) — виправ тест. І наприкінці — кілька прогонів, щоб переконатися, що він стабільний.

## Типові помилки

- Виправити тест під фактичну поведінку, не звіривши з вимогами: так справжній баг стає «очікуваним результатом».
- Залишити згенерований Codegen код як є: `test_example`, повні адреси, зайві кліки, мало перевірок.
- Закомітити `page.pause()`.
- Розслідувати падіння на CI, вгадуючи, замість того щоб відкрити трейс.

## Підсумок

- Codegen записує чернетку й підказує локатори; назви, перевірки і структуру доводиш ти.
- Повідомлення Playwright: очікуване, `Actual value`, call log і рядок тесту — читай їх першими.
- `--headed --slowmo`, `page.pause()` та `PWDEBUG=1` — подивитися на тест очима й по кроках.
- `--tracing retain-on-failure` + `show-trace` — повний запис падіння, особливо на CI.
- Скріншоти, відео й трейс — артефакти для баг-репорту.
