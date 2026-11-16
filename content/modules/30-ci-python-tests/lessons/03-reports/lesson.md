# Звіти: JUnit XML, HTML і Allure

Автотести, результат яких бачить лише той, хто їх запустив, майже марні. Звіт перетворює «щось впало» на «впав `test_wrong_password` на кроці входу, ось скріншот і трейс». Різним людям потрібні різні звіти — і всі вони створюються **з того самого прогону** опціями pytest.

| Хто читає | Що потрібно | Звіт |
|---|---|---|
| CI-сервер | машиночитні результати: скільки, що впало | JUnit XML |
| Розробник після червоного PR | який тест, помилка, скріншот, трейс | HTML / Allure + артефакти Playwright |
| QA lead, менеджер | загальна картина, тенденції, функції | Allure |
| Ти локально | швидко: що впало і чому | термінал |

## Термінал

```bash
python -m pytest -ra --durations=5
```

`-ra` — короткий підсумок з причинами для всіх не зелених тестів; `--durations=5` — п'ять найповільніших тестів наприкінці. Повільні тести — перші кандидати на оптимізацію (вхід через API замість форми, менше `goto`).

## JUnit XML — для машин

```bash
python -m pytest --junitxml=reports/junit.xml
```

Формат прийшов із Java, але його розуміють майже всі CI-системи: показують кількість тестів, упалі тести в pull request, історію.

```xml
<testsuites name="pytest tests">
  <testsuite name="pytest" errors="0" failures="1" skipped="1" tests="3" time="2.418">
    <testcase classname="tests.ui.test_search" name="test_by_name" time="1.320" />
    <testcase classname="tests.ui.test_search" name="test_empty_query" time="1.098">
      <failure message="AssertionError: ...">трасування помилки</failure>
    </testcase>
    <testcase classname="tests.api.test_reviews" name="test_add_review" time="0.000">
      <skipped type="pytest.skip" message="reviews API is not deployed">...</skipped>
    </testcase>
  </testsuite>
</testsuites>
```

| Елемент | Значення |
|---|---|
| `<testcase>` | один тест: `classname` (модуль, клас) + `name`, `time` у секундах |
| `<failure>` всередині | тест упав на перевірці |
| `<error>` всередині | помилка поза перевіркою: фікстура, налаштування (`failed on setup`) |
| `<skipped>` всередині | тест пропущено; `message` — причина |
| немає дочірніх елементів | тест пройшов |

## Розбір: читаємо JUnit XML з Python

Іноді звіт треба обробити самому: зібрати підсумок у Slack, знайти повільні тести, порівняти два прогони. Приклад — список пропущених тестів з причинами:

```python
import xml.etree.ElementTree as ET


def skipped_with_reasons(xml_text):
    root = ET.fromstring(xml_text)
    result = []
    for case in root.iter("testcase"):
        skipped = case.find("skipped")
        if skipped is not None:
            result.append((case.get("name"), skipped.get("message", "")))
    return result
```

| Виклик | Що робить |
|---|---|
| `ET.fromstring(text)` | розбирає XML-рядок у дерево елементів |
| `root.iter("testcase")` | усі `<testcase>` на будь-якій глибині — і під `<testsuites>`, і під `<testsuite>` |
| `case.find("skipped")` | перший дочірній `<skipped>` або `None` |
| `case.get("name")` | значення атрибута (рядок) або `None`; `get("time", "0")` — з типовим |

> [!WARNING]
> Перевіряй `case.find("failure") is not None`, а **не** `if case.find("failure"):`. Елемент без дочірніх елементів вважається «хибним», навіть коли він існує, — і упалий тест тихо порахується як зелений.

## pytest-html — один файл для людей

```bash
pip install pytest-html
python -m pytest --html=reports/report.html --self-contained-html
```

`--self-contained-html` вбудовує стилі й картинки в один файл — його зручно скачати з CI й відкрити в браузері. У звіті — таблиця тестів з фільтрами, тривалість, вивід і помилка кожного тесту.

## Allure — звіт з кроками й вкладеннями

```bash
pip install allure-pytest
python -m pytest --alluredir allure-results
```

pytest записує в `allure-results/` сирі результати (JSON і вкладення). Тест можна розмітити:

```python
import allure


@allure.title("Search shows only matching products")
@allure.feature("Search")
@allure.severity(allure.severity_level.CRITICAL)
def test_search_by_name(search_page):
    with allure.step("Search for 'phone'"):
        search_page.search("phone")
    with allure.step("Check the results"):
        allure.attach(search_page.page.screenshot(), name="results", attachment_type=allure.attachment_type.PNG)
        expect(search_page.results).to_have_count(3)
```

HTML-звіт з цих результатів будує окремий інструмент — **Allure Report** (версія 3 ставиться через npm і потребує Node.js):

```bash
npx allure generate allure-results
npx allure open
```

Allure показує кроки всередині тесту, вкладення, групування за функціями й важливістю, а з історією — тенденції між прогонами.

## Артефакти Playwright

pytest-playwright сам зберігає докази для упалих тестів у папку `test-results/`:

```bash
python -m pytest --screenshot only-on-failure --video retain-on-failure --tracing retain-on-failure
```

| Опція | Що зберігається |
|---|---|
| `--screenshot only-on-failure` | скріншот в момент падіння |
| `--video retain-on-failure` | відео тесту (лише якщо впав) |
| `--tracing retain-on-failure` | трейс: кроки, DOM, мережа — відкривається в Trace Viewer |
| `--output test-results` | куди класти (це типова папка) |

`retain-on-failure` записує все, але зберігає лише для упалих тестів — зелені не займають місця.

> [!TIP]
> Спробуй у лабораторії (застосунок має працювати): `npm run lab:py -- --junitxml=reports/junit.xml --html=reports/report.html --self-contained-html`. Звіти з'являться в `lab/python/reports/`. Для Allure: `npm run lab:py -- --alluredir allure-results`.

## Типові помилки

- Звіти лише локально — у CI розробник бачить тільки «exit code 1».
- `if case.find("failure"):` — упалі тести без дочірніх елементів рахуються як зелені.
- Відео й трейси `on` для всіх тестів — гігабайти артефактів, які ніхто не відкриє.
- HTML-звіт без `--self-contained-html` — скачаний файл без стилів і картинок.
- `allure-results` комітять у git — це тимчасові файли прогону, їм місце в `.gitignore` і в артефактах CI.

## Підсумок

- Один прогін — кілька звітів: термінал (`-ra`, `--durations`), JUnit XML, HTML, Allure.
- JUnit XML — для CI; читається з Python через `xml.etree.ElementTree` (`iter`, `find`, `get`).
- pytest-html: `--html=... --self-contained-html` — один файл для людей.
- Allure: `--alluredir`, `allure.step`, `allure.title`, `allure.attach`; HTML будує Allure Report CLI.
- Скріншоти, відео, трейси — `only-on-failure` / `retain-on-failure`.
