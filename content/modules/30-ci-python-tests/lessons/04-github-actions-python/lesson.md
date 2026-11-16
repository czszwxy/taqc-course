# GitHub Actions для pytest і Playwright

Ти вже знаєш, як працює CI і з чого складається workflow GitHub Actions (модуль про CI/CD). Тут — те саме для Python: інший набір кроків, свої типові помилки в логах і кілька рішень, яких немає в Node.js-проєктах.

## Повний workflow

```yaml
name: UI and API tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  schedule:
    - cron: "0 3 * * *"
  workflow_dispatch:

jobs:
  tests:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-python@v7
        with:
          python-version: "3.13"
          cache: pip

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Install Chromium
        run: python -m playwright install --with-deps chromium

      - name: Run tests
        env:
          PYTEST_BASE_URL: ${{ vars.STAGING_URL }}
          API_TOKEN: ${{ secrets.API_TOKEN }}
        run: >
          python -m pytest -n auto
          --junitxml=reports/junit.xml
          --html=reports/report.html --self-contained-html
          --screenshot only-on-failure --tracing retain-on-failure

      - name: Upload reports
        if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v7
        with:
          name: test-reports
          path: |
            reports/
            test-results/
          retention-days: 14
```

## Розбір: крок за кроком

| Крок | Що робить | Що буде без нього |
|---|---|---|
| `checkout` | кладе код репозиторію на машину | нічого запускати |
| `setup-python` + `cache: pip` | ставить Python потрібної версії, кешує скачані пакети | інша версія Python; кожен прогін качає все заново |
| `pip install -r requirements.txt` | ставить pytest, pytest-playwright, requests… з точними версіями | `ModuleNotFoundError` |
| `playwright install --with-deps chromium` | качає браузер і системні бібліотеки Linux | `Executable doesn't exist` / `missing dependencies` |
| `env:` кроку з тестами | передає адресу (vars) і токен (secrets) у змінні оточення | `API_TOKEN is not set`, тести йдуть на localhost |
| `-n auto` | pytest-xdist: тести на всіх ядрах машини | довший прогін |
| `upload-artifact` + `!cancelled()` | зберігає звіти й трейси, **навіть коли тести впали** | після червоного прогону — жодних доказів |

> [!IMPORTANT]
> Пакет Python `playwright` і браузери — різні речі. `pip install` ставить бібліотеку, а `python -m playwright install` качає самі браузери. Версія Playwright у `requirements.txt` має бути зафіксована (`playwright==…`), інакше в CI може приїхати нова версія з іншими браузерами.

## Змінні й секрети

| Що | Де задати | Як прочитати у workflow |
|---|---|---|
| адреса staging, назва середовища | Settings → Secrets and variables → Actions → **Variables** | `${{ vars.STAGING_URL }}` |
| паролі, токени | там само → **Secrets** | `${{ secrets.API_TOKEN }}` |

Секрети GitHub маскує в логах (`***`), а workflow з pull request з форку їх не отримує. Тест читає все через змінні оточення — той самий код, що й локально з `.env`.

## Матриця браузерів

```yaml
jobs:
  tests:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox]
    steps:
      # … checkout, setup-python, pip install …
      - run: python -m playwright install --with-deps ${{ matrix.browser }}
      - run: python -m pytest --browser ${{ matrix.browser }} --junitxml=reports/junit.xml
      - if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v7
        with:
          name: reports-${{ matrix.browser }}
          path: reports/
```

Матриця запускає job двічі паралельно. `fail-fast: false` — не зупиняти Firefox, коли впав Chromium. Ім'я артефакту **має бути різним** для кожного варіанта матриці, інакше другий job впаде з `Conflict: an artifact with this name already exists`.

## Де живе застосунок під тестом

- **Розгорнуте середовище** (staging, preview для pull request) — найпростіше: `PYTEST_BASE_URL` з `vars`.
- **Застосунок з того самого репозиторію** — його запускають у workflow до тестів (фоновий крок або `services:` з Docker-образом) і чекають, поки він відповідає.

## Типові помилки в логах CI

| Лог | Причина | Виправлення |
|---|---|---|
| `ModuleNotFoundError: No module named 'playwright'` | пакета немає в `requirements.txt` | додати й зафіксувати версію |
| `fixture 'page' not found` | не встановлено `pytest-playwright` | додати в `requirements.txt` |
| `Executable doesn't exist at …/ms-playwright/…` | браузери не скачані | крок `python -m playwright install --with-deps chromium` |
| `ConnectionRefusedError` / `Connection refused` на `localhost` | застосунку в CI немає | `PYTEST_BASE_URL` на staging або запуск застосунку в workflow |
| `ValueError: API_TOKEN is not set` | секрет не передано в `env` | `API_TOKEN: ${{ secrets.API_TOKEN }}` |
| звіту немає серед артефактів після червоного прогону | крок upload пропущено після падіння | `if: ${{ !cancelled() }}` |

## Підсумок

- Кроки: checkout → setup-python (кеш pip) → `pip install -r requirements.txt` → `python -m playwright install --with-deps` → pytest з `env` → upload-artifact з `!cancelled()`.
- Адреси — у `vars`, секрети — у `secrets`, у тест — через змінні оточення.
- Звіти й трейси — артефакти; для матриці — унікальні імена.
- Лог CI читай знизу вгору: перша справжня помилка зазвичай підказує, якого кроку бракує.
