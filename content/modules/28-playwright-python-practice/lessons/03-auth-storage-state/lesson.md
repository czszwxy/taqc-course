# Автентифікація і storage state

Більшість сторінок застосунку доступні лише після входу. Якщо кожен із 200 тестів входить через форму, це 200 × 3–4 секунди лише на вхід. А коли форма входу зламається, впадуть **усі** 200 тестів, і в звіті буде важко знайти справжню причину. Рішення — увійти **один раз**, зберегти сесію і давати її кожному тесту готовою.

> [!QA]
> Сам вхід тестують окремими тестами: правильний пароль, неправильний, заблокований акаунт, вихід. Усі інші тести починають уже авторизованими — вони перевіряють свою функцію, а не форму входу.

## Де живе сесія

Після входу застосунок запам'ятовує користувача в браузері: у **cookie** (найчастіше) або в **localStorage** (наприклад, токен). **Storage state** — це знімок цих даних у JSON:

```json
{
  "cookies": [{ "name": "session", "value": "abc123", "domain": "localhost", "path": "/" }],
  "origins": [
    { "origin": "http://localhost:5173", "localStorage": [{ "name": "app:token", "value": "eyJhbGciOi..." }] }
  ]
}
```

Новий контекст, створений з таким станом, одразу «залогінений»: cookies і localStorage вже на місці.

> [!NOTE]
> sessionStorage у storage state не потрапляє. Якщо застосунок тримає сесію там, її відновлюють окремо (наприклад, через `add_init_script`).

## Зберегти і використати

```python
context.storage_state(path="state.json")              # записати cookies + localStorage контексту у файл
page = new_context(storage_state="state.json").new_page()   # новий контекст із цим станом
```

`new_context` — фікстура pytest-playwright: вона створює контекст з тими ж налаштуваннями, що й `page` (`--base-url`, розмір вікна…), і сама закриває його після тесту. Звичайний `browser.new_context()` нічого цього не знає: `base_url` треба передати самому і закрити контекст теж самому.

## Вхід один раз на сесію

```python
@pytest.fixture(scope="session")
def admin_state(browser, base_url, tmp_path_factory):
    context = browser.new_context(base_url=base_url)
    page = context.new_page()
    page.goto("/admin/login")
    page.get_by_label("Username").fill("admin")
    page.get_by_label("Password").fill(os.environ["ADMIN_PASSWORD"])
    page.get_by_role("button", name="Sign in").click()
    expect(page.get_by_role("heading", name="Dashboard")).to_be_visible()

    path = tmp_path_factory.mktemp("auth") / "admin.json"
    context.storage_state(path=path)
    context.close()
    return path


def test_reports_page_opens(new_context, admin_state):
    page = new_context(storage_state=admin_state).new_page()
    page.goto("/admin/reports")
    ...
```

| Крок | Навіщо |
|---|---|
| `scope="session"` | вхід виконується **один раз** на весь запуск |
| `browser`, а не `page` | `page` має scope function — session-фікстура його попросити не може |
| `browser.new_context(base_url=...)` | тимчасовий контекст лише для входу |
| `expect(...)` після входу | переконатися, що вхід справді вдався, **до** збереження стану |
| `tmp_path_factory.mktemp(...)` | тимчасова папка на сесію (`tmp_path` — лише для одного тесту) |
| `context.storage_state(path=...)` | зберегти cookies і localStorage |
| `new_context(storage_state=...)` у тесті | кожен тест — свій контекст, але вже авторизований |

Щоб уся папка тестів автоматично стартувала авторизованою, перевизначають `browser_context_args` у її `conftest.py`:

```python
@pytest.fixture(scope="session")
def browser_context_args(browser_context_args, admin_state):
    return {**browser_context_args, "storage_state": admin_state}
```

## Вхід через API

Форма входу — найповільніший шлях. Якщо в застосунку є API входу, токен можна отримати запитом і **покласти** в стан без браузера:

```python
api = playwright.request.new_context(base_url=base_url)
response = api.post("/api/login", data={"username": "admin", "password": "…"})
assert response.ok
token = response.json()["token"]
api.dispose()

state = {
    "cookies": [],
    "origins": [{"origin": base_url, "localStorage": [{"name": "app:token", "value": token}]}],
}
page = new_context(storage_state=state).new_page()
```

`storage_state` приймає і шлях до файлу, і словник. `data=` зі словником надсилає JSON. `api.dispose()` закриває API-контекст.

## Безпека

- Файл стану — це **ключ від акаунта**. Не коміть його: тримай у `tmp_path_factory` або в папці з `.gitignore` (`auth/`).
- Паролі — зі змінних оточення (`os.environ`), а не в коді.
- Токени мають строк дії: стан, збережений учора, сьогодні може не працювати. Створюй його на кожен запуск.

## Типові помилки

| Помилка | Що станеться |
|---|---|
| session-фікстура просить `page` | `ScopeMismatch` |
| `browser.new_context(storage_state=...)` без `base_url` | `page.goto("/account")` падає: відносна адреса без бази |
| зберегли стан, не дочекавшись завершення входу | у файлі ще немає токена — тести «не залогінені» |
| усі тести користуються одним акаунтом і змінюють його налаштування | тести впливають один на одного (урок 7) |
| тест виходу (Sign out) на спільному стані з cookie-сесією | вихід на сервері анулює сесію для всіх інших тестів |

## Підсумок

- Сесія живе в cookies або localStorage; storage state — її знімок у JSON.
- Входь один раз у session-фікстурі (через UI або API), зберігай `context.storage_state(path=...)`.
- Тести створюють свої контексти зі станом: `new_context(storage_state=...)`.
- Вхід і вихід перевіряють окремими тестами.
- Файли стану не комітять, паролі беруть зі змінних оточення.
