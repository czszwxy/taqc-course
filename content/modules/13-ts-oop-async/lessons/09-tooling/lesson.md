# tsconfig, strict mode, ESLint і Prettier

Коли ти створиш власний проєкт автотестів (`npm init playwright@latest`), поруч із тестами з'являться конфігураційні файли. Цей урок пояснює, що в них і навіщо — щоб ти не боялася їх відкривати і розуміла повідомлення інструментів.

## tsconfig.json

Файл налаштувань компілятора TypeScript:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "strict": true,
    "outDir": "dist",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["tests", "src"]
}
```

| Опція | Що означає |
|---|---|
| `target` | у яку версію JavaScript компілювати (`ES2022` — сучасний синтаксис) |
| `module` | формат модулів у результаті (`commonjs`, `esnext`) |
| `strict` | вмикає набір суворих перевірок (див. нижче) — **завжди true** |
| `include` | які файли/папки компілювати |
| `outDir` | куди класти зібраний JavaScript |
| `noUnusedLocals` | помилка на невикористані змінні |
| `noImplicitReturns` | кожна гілка функції має повертати значення |

> [!NOTE]
> Playwright сам компілює TypeScript-тести, тому `tsconfig.json` у тестовому проєкті часто потрібен лише для редактора і перевірки `npx tsc --noEmit`.

## strict: true

Це не одна опція, а кілька:

| Перевірка | Що ловить |
|---|---|
| `noImplicitAny` | параметр без типу (`function f(x)`) |
| `strictNullChecks` | використання значення, що може бути `null`/`undefined` (результат `find`, необов'язкові поля) |
| `strictPropertyInitialization` | поле класу без початкового значення |
| `strictFunctionTypes`, `useUnknownInCatchVariables`… | тонші помилки типів; `catch (e)` має тип `unknown` |

Усі завдання цього курсу перевіряються в strict-режимі — тому ти вже звикла до його вимог.

## ESLint — пошук проблем у коді

**ESLint** читає код і знаходить потенційні баги й погані практики, які компілятор пропускає:

- забутий `await` (`@typescript-eslint/no-floating-promises`) — головна причина нестабільних тестів;
- `test.only` чи `page.pause()`, випадково залишені в коді (плагін `eslint-plugin-playwright`);
- невикористані змінні, `any`, `==` замість `===`.

```bash
npx eslint tests/
```

## Prettier — однакове форматування

**Prettier** нічого не перевіряє — він **переформатовує** код: відступи, лапки, крапки з комою, перенесення довгих рядків. Уся команда пише в одному стилі, а в code review не сперечаються про пробіли.

```bash
npx prettier --write .
```

| Інструмент | Питання | Приклад |
|---|---|---|
| **TypeScript (tsc)** | Чи правильні типи? | `string` передали замість `number` |
| **ESLint** | Чи немає підозрілого коду? | забутий `await`, `test.only` |
| **Prettier** | Чи однаково відформатовано? | відступи, лапки, ширина рядка |
| **Тести** | Чи правильно працює? | кошик рахує неправильну суму |

> [!QA]
> У CI (модуль 18) ці перевірки запускаються перед тестами: `tsc --noEmit`, `eslint`, `prettier --check`. Якщо хоч одна впала — збірка червона. Це дешевий спосіб ловити помилки ще до запуску браузера.

## Підсумок

- `tsconfig.json` — налаштування компілятора: `target`, `module`, `strict`, `include`, `outDir`.
- `strict: true` — завжди; ловить `any`, `null`/`undefined`, неініціалізовані поля.
- ESLint знаходить підозрілий код (забутий `await`!), Prettier — форматує.
- tsc, ESLint, Prettier і тести перевіряють різне і доповнюють одне одного.
