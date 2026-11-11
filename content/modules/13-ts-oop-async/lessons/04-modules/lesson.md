# Модулі: import і export

Тестовий проєкт швидко росте: сторінки, тестові дані, хелпери, конфіги. Тримати все в одному файлі неможливо. **Модуль** — це просто файл, який **експортує** те, що можна використати, і **імпортує** те, що йому потрібно з інших файлів.

```text
tests/
  pages/
    LoginPage.ts      export class LoginPage
    CartPage.ts       export class CartPage
    index.ts          export * from './LoginPage' …   (barrel)
  data/
    users.ts          export const USERS = …
  helpers/
    money.ts          export function formatMoney…
  login.spec.ts       import { LoginPage } from './pages'
```

## Named export / import

```ts
// money.ts
export const CURRENCY = 'UAH';
export function formatMoney(amount: number): string { … }

// cart.ts
import { formatMoney, CURRENCY } from './money';      // names must match
import { formatMoney as fmt } from './money';         // rename on import
import * as money from './money';                      // everything as an object: money.formatMoney
```

## Default export

Один «головний» експорт файлу:

```ts
// LoginPage.ts
export default class LoginPage { … }

// test.ts
import LoginPage from './LoginPage';           // any name, no braces
import Page, { LOGIN_URL } from './LoginPage';  // default + named together
```

> [!TIP]
> Багато команд **уникають** default export: з named export ім'я однакове в усьому проєкті, а редактор краще підказує імпорти. Але default ти все одно зустрінеш, наприклад `export default defineConfig({...})` у `playwright.config.ts`.

## import type

```ts
import type { User } from './models';        // only the type, nothing at runtime
import { createUser, type User } from './models';
```

## Re-export і barrel-файли

```ts
// pages/index.ts — a "barrel": one place to import from
export { LoginPage } from './LoginPage';
export { CartPage } from './CartPage';
export * from './components';
export { formatMoney as money } from '../helpers/money';   // re-export with a new name
export type { User } from '../data/models';
```

Тепер тест імпортує все з одного місця: `import { LoginPage, CartPage } from './pages';`.

## Шляхи

- `./file` — файл у тій самій папці; `../file` — на рівень вище.
- Розширення `.ts` не пишуть: `from './money'`.
- Без `./` — пакет з `node_modules`: `import { test, expect } from '@playwright/test';`

> [!QA]
> Перший рядок майже кожного тесту Playwright — імпорт: `import { test, expect } from '@playwright/test';`. Далі йдуть імпорти твоїх Page Objects і тестових даних. Акуратна структура модулів — ознака професійного тестового проєкту.

## Практика

У завданнях цього уроку поруч із твоїм файлом є **інші файли проєкту** (наприклад, `money.ts`). Їх видно над редактором; змінювати їх не можна, а імпортувати — потрібно.

## Підсумок

- Модуль = файл; `export` робить значення доступним, `import` — використовує.
- Named: `import { a, b as c } from './x'`; default: `import Anything from './x'`.
- `import type` — лише типи; barrel `index.ts` реекспортує з кількох файлів.
- Відносні шляхи `./`, `../`; без `./` — пакети з node_modules.
