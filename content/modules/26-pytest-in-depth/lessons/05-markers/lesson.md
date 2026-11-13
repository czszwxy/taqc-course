# Маркери і вибір тестів

Коли тестів сотні, не завжди треба запускати всі: на pull request — швидкий smoke, вночі — повну регресію, на Windows — без тестів, які там неможливі. **Маркери** — це мітки на тестах, за якими pytest вирішує, що запускати і як трактувати результат.

## skip і skipif

```python
import sys
import pytest

@pytest.mark.skip(reason="payment sandbox is not available yet, INFRA-9")
def test_pay_with_card():
    ...

@pytest.mark.skipif(sys.platform == "win32", reason="uses Unix file permissions")
def test_report_permissions():
    ...
```

- `skip` — пропустити завжди (з обов'язковою причиною).
- `skipif(умова, reason=...)` — пропустити, лише якщо умова істинна.
- Усередині тесту можна викликати `pytest.skip("причина")`, коли з'ясувалося, що тест неможливий.

У звіті пропущені тести позначені `s` і не рахуються ні як пройдені, ні як упалі.

## xfail — очікуване падіння

```python
@pytest.mark.xfail(reason="QA-17: wrong separators in millions", strict=True)
def test_price_in_millions():
    assert format_price(1234567) == "1 234 567 UAH"
```

Тест **виконується**. Якщо він падає — це очікувано: позначка `x`, прогін зелений. Якщо раптом проходить — `XPASS`.

## Розбір: що буде з тестом під xfail

| Результат тесту | Без `strict` | З `strict=True` |
|---|---|---|
| упав (баг ще є) | `x` xfailed — норма | `x` xfailed — норма |
| пройшов (баг виправили) | `X` XPASS — лише позначка | ❌ **падіння**: «очікували падіння, а тест пройшов» |

`strict=True` — найкорисніший режим для відомих багів: коли баг виправлять, прогін стане червоним і нагадає зняти позначку. Без `strict` виправлення легко пропустити, і тест назавжди лишиться «очікувано упалим».

## Власні маркери

```python
@pytest.mark.smoke
def test_login_with_valid_password():
    ...

@pytest.mark.slow
@pytest.mark.api
def test_full_order_history_export():
    ...
```

Маркери реєструють у конфігурації, щоб опечатка не створила новий маркер мовчки:

```toml
[tool.pytest.ini_options]
markers = [
    "smoke: fast critical checks for every pull request",
    "slow: long tests for the nightly run",
    "api: tests that call the HTTP API",
]
addopts = "--strict-markers"
```

З `--strict-markers` незареєстрований маркер (`@pytest.mark.smok`) — помилка, а не тихий новий маркер.

## Вибір тестів через -m

| Команда | Що запуститься |
|---|---|
| `python -m pytest -m smoke` | лише тести з маркером `smoke` |
| `python -m pytest -m "not slow"` | усі, крім `slow` |
| `python -m pytest -m "smoke and not slow"` | smoke, але не повільні |
| `python -m pytest -m "api or smoke"` | хоча б один з двох маркерів |

Маркер на класі діє на всі його тести; для цілого файлу — змінна `pytestmark = pytest.mark.api` на початку модуля.

> [!QA]
> Маркери — міст між тестами і CI: на pull request запускають `-m smoke` за хвилини, а повну регресію — за розкладом. А `xfail(strict=True)` з номером тікета — чесний спосіб тримати прогін зеленим, не ховаючи відомий баг.

## Типові помилки

- `skip` без причини — через місяць ніхто не пам'ятає, чому тест вимкнено.
- `xfail` без `strict` для відомого бага — виправлення пройде непоміченим.
- `skip` замість виправлення нестабільного тесту — проблема лишається, а покриття тихо зменшується.
- Опечатка в назві маркера без `--strict-markers` — тест не потрапляє у вибірку `-m`.
- `-m smoke and not slow` без лапок — термінал розірве вираз на кілька аргументів.

## Підсумок

- `skip` / `skipif` — пропустити (з причиною); `pytest.skip()` — зсередини тесту.
- `xfail` — очікуване падіння; `strict=True` — XPASS стає падінням і нагадує, що баг виправлено.
- Власні маркери реєструють у конфігурації, `--strict-markers` ловить опечатки.
- `-m "вираз"` з `and`, `or`, `not` обирає тести за маркерами.
