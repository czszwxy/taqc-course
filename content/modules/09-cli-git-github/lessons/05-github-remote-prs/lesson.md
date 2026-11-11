# GitHub: remote, push/pull, pull requests

Git працює на твоєму комп'ютері. Щоб команда бачила зміни одне одного, потрібна спільна копія репозиторію на сервері. Найпопулярніший такий сервер — **GitHub** (є ще GitLab і Bitbucket). Портфоліо з автотестами на GitHub — це ще й те, що рекрутер відкриває першим.

## Git і GitHub — не одне й те саме

| Git | GitHub |
|---|---|
| програма для версій, працює локально | вебсервіс, що зберігає репозиторії |
| коміти, гілки, merge | + pull requests, рев'ю, issues, CI (GitHub Actions) |

## Remote (віддалений репозиторій)

**Remote** — адреса копії репозиторію на сервері. Основний remote традиційно називається **origin**.

```bash
git clone https://github.com/<owner>/<repo>.git   # завантажити репозиторій (з історією) і налаштувати origin
git remote -v                                     # подивитися адреси remote
```

## push, pull, fetch

```bash
git push -u origin feature/search-tests   # перший push нової гілки (-u запам'ятовує зв'язок)
git push                                  # наступні push цієї гілки
git pull                                  # забрати нові коміти з сервера і влити в поточну гілку
git fetch                                 # лише завантажити нові коміти, нічого не вливаючи
```

`git pull` = `git fetch` + `git merge`. Перед початком нової задачі онови `main`: `git switch main` і `git pull`. Інакше відгалузишся від застарілого коду.

> [!WARNING]
> `git push` відхилено з повідомленням «rejected … fetch first»? На сервері є коміти, яких у тебе немає. Зроби `git pull`, розв'яжи конфлікти, якщо вони будуть, і повтори `git push`. **Не** використовуй `--force`: він перезапише чужі коміти.

## Автентифікація

GitHub не приймає звичайний пароль акаунта для git-операцій. Варіанти:

- **HTTPS + Personal Access Token** (або вхід через браузер у Git Credential Manager на Windows);
- **SSH-ключ**: пара ключів, публічний додається в налаштування GitHub.

Токени й ключі — це секрети. Вони не потрапляють у код, скріншоти й чати.

## Pull request (PR)

**Pull request** — запит «влий мою гілку в `main`». Це головне місце командної роботи:

1. Ти пушиш гілку і відкриваєш PR на GitHub: **base** `main` ← **compare** `feature/search-tests`.
2. Пишеш опис: **що** змінено, **навіщо** (посилання на задачу) і **як перевірено**.
3. **CI** (GitHub Actions) автоматично запускає збірку й тести. Результат видно в PR: ✅ або ❌.
4. Колеги роблять **review**: коментують рядки, ставлять **Approve** або **Request changes**.
5. Ти виправляєш і пушиш нові коміти в ту саму гілку. PR оновлюється сам.
6. Після approve і зелених перевірок PR **вливають** (merge, squash and merge або rebase and merge), а гілку видаляють.

> [!QA]
> Для QA Automation PR — щоденний інструмент:
> - твої тести проходять рев'ю, як і код розробників;
> - ти рев'юїш PR розробників: чи є тести на нову логіку, чи не видалили «незручний» тест;
> - червоний CI в PR — сигнал, що зміна щось зламала, ще до того, як вона потрапила в `main`. Саме тому автотести мають бути стабільними: «flaky» тести вчать команду ігнорувати червоний.

## Добрий опис PR

```text
Title: Add search page tests and fix flaky cart test (QA-217)

What & why
- Add 3 tests for the search page: empty query, category filter, "No results" message
- Fix flaky cart test: wait for the cart API response instead of waitForTimeout(3000)
Task: QA-217

How it was tested
- npx playwright test — 24 passed locally
- new and fixed tests run 10 times (--repeat-each=10) — 0 failures
```

Маленькі PR (до кількох сотень рядків) рев'юють швидше і якісніше, ніж гігантські.

## Fork

**Fork** — твоя копія чужого репозиторію на GitHub. Так роблять внесок у проєкти, куди немає прав на запис (open source): fork → гілка → push у свій fork → PR в оригінал.

## Підсумок

- Git працює локально, GitHub зберігає спільну копію і додає PR, рев'ю, CI.
- `origin` — основний remote. `clone` завантажує репозиторій, `push` відправляє коміти, `pull` = `fetch` + `merge`.
- Для доступу потрібен токен або SSH-ключ, не пароль. Секрети не потрапляють у код.
- PR = гілка + опис (що, навіщо, як перевірено) + CI + рев'ю → merge.
- Замість `push --force` роби `pull`, потім `push`.
