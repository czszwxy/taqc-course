# Налаштування і змінні оточення

Ті самі тести запускають у різних місцях: на твоєму ноутбуці проти `localhost`, у CI проти staging, вночі — у headless-режимі з довшими таймаутами. Змінювати код для кожного середовища — шлях до помилок. Тому все, що відрізняється між середовищами, тест отримує **ззовні** — через змінні оточення.

> [!QA]
> Секрети (паролі тестових акаунтів, токени API) **ніколи** не пишуть у код і не комітять — навіть у приватний репозиторій. Тест читає їх зі змінних оточення, а значення задаються локально у файлі `.env` (він у `.gitignore`) або в секретах CI.

## Змінні оточення в Python

```python
import os

host = os.environ.get("SMTP_HOST", "localhost")   # необов'язкова: є типове значення
password = os.environ["SMTP_PASSWORD"]             # обов'язкова: KeyError, якщо немає
```

| Запис | Змінної немає | Змінна є |
|---|---|---|
| `os.environ["X"]` | `KeyError: 'X'` | рядок |
| `os.environ.get("X")` | `None` | рядок |
| `os.environ.get("X", "default")` | `"default"` | рядок |

Головне: значення змінної оточення — **завжди рядок**.

## Пастка: рядки замість чисел і булевих значень

```python
port = os.environ.get("SMTP_PORT", "25")
port + 1                 # TypeError: can only concatenate str (not "int") to str
int(port) + 1            # 26 ✓

use_tls = os.environ.get("SMTP_TLS", "true")
bool("false")            # True (!) — будь-який непорожній рядок «істинний»
```

`bool("false")` — класична помилка: людина пише `SMTP_TLS=false`, а код однаково вмикає TLS. Булеве значення читають через порівняння зі списком слів, а незнайоме слово — помилка, а не мовчазне «так».

## Розбір: читаємо налаштування пошти

```python
import os
from dataclasses import dataclass


@dataclass(frozen=True)
class MailSettings:
    host: str
    port: int
    password: str


def load_mail_settings(env=os.environ) -> MailSettings:
    password = env.get("SMTP_PASSWORD", "")
    if not password:
        raise ValueError("SMTP_PASSWORD is not set")
    return MailSettings(
        host=env.get("SMTP_HOST", "localhost"),
        port=int(env.get("SMTP_PORT", "25")),
        password=password,
    )
```

| Ситуація | Результат |
|---|---|
| нічого не задано | `ValueError: SMTP_PASSWORD is not set` — зрозуміло, чого бракує |
| `SMTP_PASSWORD=s3cret` | `MailSettings(host='localhost', port=25, password='s3cret')` |
| `SMTP_PORT=587` | `port=587` — уже число |
| `SMTP_PORT=abc` | `ValueError: invalid literal for int()` — одразу на старті, а не посеред тесту |

Чому так:

- **`frozen=True`** — налаштування не змінюються посеред прогону;
- **параметр `env`** зі значенням `os.environ` — у тестах можна передати звичайний словник;
- **перевірки на старті** — краще впасти з ясним повідомленням до першого тесту, ніж отримати 401 у п'ятдесятому.

## Фікстура settings

```python
@pytest.fixture(scope="session")
def settings():
    return load_settings()
```

Налаштування читаються **один раз** на прогін, а тести й інші фікстури просто приймають `settings` параметром: `settings.base_url`, `settings.timeout_ms`.

Для адреси застосунку в pytest-playwright уже є готове: опція `--base-url` або змінна оточення `PYTEST_BASE_URL` (вона важливіша за `base_url` у конфігурації, а `--base-url` у команді — важливіший за все).

## Файл .env

Локально змінні зручно тримати у файлі `.env` у корені проєкту:

```text
BASE_URL=http://localhost:5173
SMTP_PASSWORD=local-only-password
```

Python сам цей файл не читає — його завантажує бібліотека `python-dotenv` (`load_dotenv()` на старті) або IDE. У репозиторій кладуть **`.env.example`** з назвами змінних без справжніх значень, а `.env` — у `.gitignore`.

## Як тестувати налаштування: monkeypatch

```python
def test_port_from_env(monkeypatch):
    monkeypatch.setenv("SMTP_PASSWORD", "s3cret")
    monkeypatch.setenv("SMTP_PORT", "587")
    assert load_mail_settings().port == 587


def test_password_is_required(monkeypatch):
    monkeypatch.delenv("SMTP_PASSWORD", raising=False)
    with pytest.raises(ValueError, match="SMTP_PASSWORD"):
        load_mail_settings()
```

`setenv` і `delenv` діють лише на час тесту — після нього оточення повертається. `raising=False` означає «не падати, якщо змінної й так немає». Типові значення перевіряй лише після `delenv`: на машині колеги змінна може бути задана.

## Типові помилки

- `bool(os.environ.get("HEADLESS"))` — `"false"` стає `True`.
- `os.environ["X"]` глибоко в тесті — `KeyError` посеред прогону замість ясного повідомлення на старті.
- Адреса з `/` в кінці + шлях з `/` на початку — `//api/orders`.
- Секрет у коді «тимчасово» — він залишиться в історії git назавжди.
- Тест типового значення без `delenv` — зелений у тебе, червоний у колеги з іншим оточенням.

## Підсумок

- Усе, що відрізняється між середовищами, — у змінних оточення; секрети — лише там.
- Значення — завжди рядки: `int(...)`, а булеві — через список слів, не `bool(...)`.
- `Settings` як frozen dataclass + `load_settings(env)` з перевірками на старті + фікстура `settings` (scope session).
- `.env` локально (у `.gitignore`), `.env.example` у репозиторії, секрети CI на сервері.
- Тести налаштувань — через `monkeypatch.setenv` / `delenv`.
