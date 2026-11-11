# Перший тест: CLI, UI mode, headed, codegen

## Анатомія тесту

```ts
import { test, expect } from '@playwright/test';

test('demo user can sign in', async ({ page }) => {
  // Arrange — відкрити сторінку
  await page.goto('/playground/login');

  // Act — дії користувача
  await page.getByLabel('Email').fill('demo@taskly.test');
  await page.getByLabel('Password', { exact: true }).fill('Demo1234');
  await page.getByRole('button', { name: 'Log in' }).click();

  // Assert — перевірки
  await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
});
```

- `test(назва, async ({ page }) => { … })` — один тест. Назва описує **поведінку**: «demo user can sign in», а не «test1».
- `{ page }` — **фікстура**: Playwright сам відкриває для тесту нову вкладку в чистому браузерному контексті (без cookies і localStorage попереднього тесту).
- `await` — кожна дія асинхронна (модуль 13). Забутий `await` — найчастіша помилка початківця: тест іде далі, не дочекавшись дії.
- `page.getBy…` — **локатор**, «інструкція, як знайти елемент» (урок 5).
- `expect(locator).toBeVisible()` — **перевірка**. Без перевірок тест нічого не тестує.

> [!WARNING]
> Тест без `expect` проходить завжди, навіть коли сторінка зламана. Кожен тест має закінчуватися перевіркою **результату** з вимог.

## Запуск з CLI

| Команда | Що робить |
|---|---|
| `npx playwright test` | усі тести (headless — без вікна браузера) |
| `npx playwright test login.spec.ts` | один файл |
| `npx playwright test -g "sign in"` | тести, у назві яких є «sign in» (`--grep`) |
| `npx playwright test --headed` | показати вікно браузера |
| `npx playwright test --project=chromium` | лише один project з конфігу |
| `npx playwright test --workers=1` | без паралельності, по одному |
| `npx playwright test --debug` | Playwright Inspector: крок за кроком |
| `npx playwright test --ui` | UI mode |
| `npx playwright test --repeat-each=10` | кожен тест 10 разів (пошук flaky) |
| `npx playwright show-report` | HTML-звіт |

У лабораторії курсу ті самі прапорці передаються через `npm run lab -- …`, наприклад `npm run lab -- --headed`.

## UI mode

`npx playwright test --ui` відкриває вікно, де видно всі тести. Їх можна запускати по одному, бачити кожен крок зі знімком сторінки, «перемотувати» тест назад. Є і режим **watch**: тест перезапускається при збереженні файлу. Це найзручніший спосіб писати й налагоджувати тести.

## Codegen

```bash
npx playwright codegen http://localhost:5173/playground/login
```

Відкриється браузер і вікно з кодом. Ти клікаєш і друкуєш, а Playwright записує дії у вигляді тесту з рекомендованими локаторами.

> [!TIP]
> Codegen — чудовий спосіб підглянути локатор («як Playwright знайде цю кнопку?»). Але записаний код — чернетка: у ньому немає перевірок з вимог, назв, структури. Його треба доробити.

## Звіт і результати

- Після прогону в терміналі видно `✓` / `✘` і час кожного тесту.
- `npx playwright show-report` відкриває HTML-звіт: кроки, помилки, скріншоти, trace.
- Повідомлення про помилку читається як мініатюрний баг-репорт:

```text
Error: expect(locator).toHaveText(expected) failed
Locator:  getByTestId('signed-in-as')
Expected: "Signed in as demo@taskly.test"
Received: "Signed in as DEMO@taskly.test"
Timeout:  3000ms
```

## Як перевіряються завдання модуля

Ти пишеш тест у редакторі на сторінці завдання. **▶ Run** запускає його в Chromium на правильній сторінці. **✓ Check** запускає ще й на версіях сторінки з багами. Адреси відносні: `page.goto('/playground/login')`.

> [!QA]
> Назва тесту, кроки і перевірка — це твій тест-кейс з модуля 04, тільки виконуваний. Добра назва (`locked account cannot sign in`) у звіті одразу каже, **яка вимога** зламалася.

## Підсумок

- Тест = `test('назва', async ({ page }) => …)` + Arrange (goto) → Act (fill, click) → Assert (`expect`).
- Кожна дія з `await`. Кожен тест закінчується перевіркою з вимог.
- CLI: файл, `-g`, `--headed`, `--project`, `--workers`, `--debug`, `--ui`, `--repeat-each`, `show-report`.
- UI mode — для написання й налагодження, codegen — для чернетки й підказки локаторів.
