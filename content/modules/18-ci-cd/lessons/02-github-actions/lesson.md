# GitHub Actions для Playwright

**GitHub Actions** — вбудований у GitHub CI. Workflow описується YAML-файлом у папці `.github/workflows/` репозиторію. GitHub сам запускає його на своїх машинах (runners) у відповідь на події: push, pull request, розклад.

## Будова workflow

```yaml
name: Playwright Tests            # назва в інтерфейсі GitHub

on:                               # КОЛИ запускати
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:                             # ЩО запускати
  test:
    timeout-minutes: 30
    runs-on: ubuntu-latest        # на якій машині
    steps:                        # кроки по черзі
      - uses: actions/checkout@v4          # забрати код репозиторію
      - uses: actions/setup-node@v4        # встановити Node.js
        with:
          node-version: lts/*
          cache: npm                       # кешувати npm-пакети між запусками
      - run: npm ci                        # точні версії з package-lock.json
      - run: npx playwright install --with-deps   # браузери + системні бібліотеки
      - run: npx playwright test
      - uses: actions/upload-artifact@v4   # зберегти звіт (урок 3)
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14
```

| Ключ | Значення |
|---|---|
| `on` | події-тригери |
| `jobs` | завдання. Різні jobs за замовчуванням ідуть паралельно на різних машинах |
| `runs-on` | тип машини (`ubuntu-latest`, `windows-latest`, `macos-latest`) |
| `steps` | кроки job по черзі |
| `uses` | готова дія (action) з маркетплейсу: `owner/name@version` |
| `run` | shell-команда |
| `with` | параметри для action |
| `if` | умова виконання кроку |

> [!TIP]
> `npx playwright install --with-deps` на Linux ставить і браузери, і системні бібліотеки. Альтернатива — запускати job в офіційному Docker-образі Playwright (`container: mcr.microsoft.com/playwright:…`), де все вже встановлено.

> [!NOTE]
> Версії actions (`@v4`) з часом оновлюються. Беріть актуальну версію з документації Playwright або сторінки action на GitHub.

## Тригери

```yaml
on:
  pull_request:                    # на кожен PR
  push:
    branches: [main]               # після злиття
  schedule:
    - cron: '0 2 * * *'            # щоночі о 02:00 UTC
  workflow_dispatch:               # кнопка «Run workflow» вручну
```

## Секрети і змінні

Паролі й токени не пишуть у YAML. Їх додають у **Settings → Secrets and variables → Actions** і передають у кроки:

```yaml
      - run: npx playwright test
        env:
          BASE_URL: ${{ vars.STAGING_URL }}          # звичайна змінна
          QA_PASSWORD: ${{ secrets.QA_PASSWORD }}    # секрет, у логах замінюється на ***
          CI: true
```

У конфігу вони читаються як `process.env.BASE_URL` (модуль 17). Змінну `CI` GitHub Actions задає сам, тому `retries: process.env.CI ? 2 : 0` працює автоматично.

## Різні набори для різних подій

```yaml
      - name: Smoke on PR
        if: github.event_name == 'pull_request'
        run: npx playwright test --grep @smoke
      - name: Full regression at night
        if: github.event_name == 'schedule'
        run: npx playwright test
```

## Результат у pull request

Кожен job показується в PR як **check**: ✅ або ❌ з посиланням на логи. У налаштуваннях гілки (**branch protection**) можна зробити check обов'язковим. Тоді PR з червоними тестами не вдасться злити.

> [!QA]
> Workflow — теж код. Його рев'юють, тримають простим і документують у README. Найчастіші помилки новачків: `npm install` замість `npm ci`, забуті браузери (`playwright install`), паролі прямо в YAML, звіт не зберігається, коли тести впали (немає `if: ${{ !cancelled() }}` або `if: always()`).

## Підсумок

- Workflow — YAML у `.github/workflows/`: `on` (коли), `jobs` (що), `runs-on` (де), `steps` (`uses` / `run`).
- Типовий Playwright-job: checkout → setup-node → `npm ci` → `npx playwright install --with-deps` → `npx playwright test` → upload звіту.
- Тригери: `pull_request`, `push`, `schedule` (cron), `workflow_dispatch`.
- Секрети — `${{ secrets.NAME }}`, змінні — `${{ vars.NAME }}`, у тестах це `process.env`.
- Check у PR плюс branch protection не дадуть влити зміну з червоними тестами.
