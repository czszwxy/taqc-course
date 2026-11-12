# Артефакти, звіти й шардинг

Машина CI зникає після прогону разом з усіма файлами. Якщо тест упав о 3-й ночі, а звіту не зберегли, розбирати нічого: лишився лише лог. **Артефакти** — файли, які workflow зберігає після завершення: HTML-звіт, trace, скріншоти, відео, JUnit XML.

## Зберегти звіт

```yaml
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}            # і після падіння тестів!
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14                # скільки днів зберігати
```

У конфігу на CI вмикають записи, потрібні для розбору: `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'` (модуль 17). Вони потрапляють у HTML-звіт, а звіт — в артефакт.

Завантаживши артефакт зі сторінки прогону (вкладка **Summary → Artifacts**), розпакуй його і відкрий:

```bash
npx playwright show-report playwright-report
```

Trace з артефакту відкривається так само, як локальний: кроки, DOM до/після, мережа, консоль.

## Як розбирати впалий прогін

1. **Лог кроку тестів**: які тести впали, Expected/Received, на якому кроці.
2. **Групування**: одна помилка в багатьох тестах — одна причина (модуль 17, урок 6).
3. **Артефакти**: trace і скріншот впалого тесту. Що бачив браузер? Що відповів сервер?
4. **Оточення**: чи впав сам job (немає браузерів, `npm ci` зламався, таймаут job), чи тести?
5. **Відтворення локально**: `npx playwright test cart.spec.ts --project=webkit`, той самий `BASE_URL`.

> [!TIP]
> Якщо job упав ще до тестів (наприклад, `Executable doesn't exist`), проблема в workflow, а не в продукті: забули `npx playwright install --with-deps` або змінилася версія Playwright.

## Шардинг: ділимо набір між машинами

Набір на 40 хвилин можна розкласти на 4 машини по 10 хвилин. GitHub Actions запускає копії job через **matrix**:

```yaml
jobs:
  test:
    strategy:
      fail-fast: false                 # не зупиняти інші шарди, якщо один упав
      matrix:
        shardIndex: [1, 2, 3, 4]
        shardTotal: [4]
    runs-on: ubuntu-latest
    steps:
      # … checkout, setup-node, npm ci, playwright install …
      - run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: blob-report-${{ matrix.shardIndex }}
          path: blob-report
          retention-days: 1
```

У конфігу для CI ставлять репортер `blob`: `reporter: process.env.CI ? 'blob' : 'html'`. Кожен шард пише свій шматок.

## Об'єднати звіти

Окремий job після всіх шардів збирає один HTML:

```yaml
  merge-reports:
    if: ${{ !cancelled() }}
    needs: [test]                       # після всіх шардів
    runs-on: ubuntu-latest
    steps:
      # … checkout, setup-node, npm ci …
      - uses: actions/download-artifact@v4
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true
      - run: npx playwright merge-reports --reporter html ./all-blob-reports
      - uses: actions/upload-artifact@v4
        with:
          name: html-report
          path: playwright-report
          retention-days: 14
```

## Час і гроші

- хвилини CI коштують грошей (для приватних репозиторіїв) і часу людей, що чекають;
- шардинг пришвидшує, але кожна машина окремо встановлює залежності й браузери (кеш допомагає);
- швидкі набори на PR, повні — вночі (урок 1);
- `fullyParallel: true` + розумна кількість `workers` на кожній машині.

> [!QA]
> Звіт з артефактів — найкращий доказ у баг-репорті з CI: посилання на прогін, назва тесту, trace і скріншот. Розробник відкриває trace і бачить точно те, що бачив тест, навіть якщо в нього локально «все працює».

## Підсумок

- Артефакти зберігають звіти, trace, скріншоти й відео після прогону. Завантажують їх з `if: ${{ !cancelled() }}`.
- Розбір падіння: лог → групування → артефакти (trace) → оточення → локальне відтворення.
- Шардинг: `matrix` + `--shard=i/n`, репортер `blob` на CI, `fail-fast: false`.
- Окремий job з `needs` об'єднує blob-звіти через `merge-reports` в один HTML.
- Баланс швидкості й вартості: що, де і як часто запускати.
