# Node.js і npm

TypeScript-код і Playwright-тести виконуються на **Node.js**: це середовище, яке запускає JavaScript поза браузером. А **npm** (Node Package Manager) встановлює бібліотеки, з яких складається тестовий проєкт: `@playwright/test`, `typescript` тощо.

## Встановлення і перевірка

Node.js встановлюють з nodejs.org, версію **LTS** (long-term support, стабільна). npm іде в комплекті. Перевірка:

```bash
node -v     # v22.11.0
npm -v      # 10.9.0
```

Якщо бачиш «not recognized» / «command not found», перезапусти термінал. Якщо не допомогло, Node.js не потрапив у PATH (див. попередній урок).

## package.json — паспорт проєкту

```json
{
  "name": "gadgetly-tests",
  "scripts": {
    "test": "playwright test",
    "test:smoke": "playwright test --grep @smoke",
    "lint": "eslint ."
  },
  "dependencies": {
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0",
    "typescript": "^5.6.3"
  }
}
```

- **scripts** — іменовані команди проєкту. Їх запускають через `npm run <назва>`;
- **dependencies** — бібліотеки, потрібні застосунку під час роботи;
- **devDependencies** — потрібні лише розробникам і тестам (тест-раннер, TypeScript, лінтер). Тестові проєкти майже все тримають тут;
- `^1.48.0` означає «1.48.0 або новіша сумісна 1.x». Точні встановлені версії записані в **package-lock.json**.

## Основні команди

| Команда | Що робить |
|---|---|
| `npm install` (`npm i`) | встановлює **всі** залежності з package.json у папку `node_modules` |
| `npm install zod` | додає пакет у `dependencies` і встановлює його |
| `npm install -D @playwright/test` | додає пакет у `devDependencies` (`-D` = `--save-dev`) |
| `npm run test:smoke` | запускає скрипт `test:smoke` з package.json |
| `npm test` | скорочення для `npm run test` (так само `npm start`) |
| `npx playwright test` | запускає CLI пакета з `node_modules` без глобального встановлення |
| `npm ci` | чисте встановлення **точно** за package-lock.json (так роблять на CI) |

> [!TIP]
> Склонував чужий проєкт? Перша команда майже завжди `npm install` (або `npm ci`). Далі подивись `scripts` у package.json: там написано, як проєкт запускати й тестувати.

## node_modules і package-lock.json

- **node_modules** — папка з усіма встановленими пакетами. Вона величезна (сотні МБ) і в Git **не комітиться**: кожен відтворює її командою `npm install`.
- **package-lock.json** — точні версії всього дерева залежностей. Його **комітять**, щоб у всіх і на CI стояли однакові версії.

> [!QA]
> «У мене тести проходять, а на CI падають». Одна з частих причин — різні версії пакетів. `npm ci` на CI і закомічений package-lock.json прибирають цю різницю. Це та сама ідея відтворюваного середовища, що й у баг-репортах: однакові умови → однаковий результат.

## Типові проблеми

```text
npm ERR! enoent Could not read package.json      ← ти не в папці проєкту (перевір pwd)
Missing script: "tests"                          ← одрук у назві скрипта: є "test"
Cannot find module '@playwright/test'            ← не виконано npm install
EACCES / EPERM                                   ← немає прав (не запускай npm з sudo, перевір антивірус і права на папку)
```

Коли все зовсім заплуталося, допомагає перевстановлення: видали `node_modules` і виконай `npm install` знову.

## Старт Playwright-проєкту (забігаючи наперед)

```bash
mkdir gadgetly-tests
cd gadgetly-tests
npm init -y                       # створює package.json
npm install -D @playwright/test   # тест-раннер
npx playwright install            # завантажує браузери
npx playwright test               # запускає тести
```

## Підсумок

- Node.js виконує JS/TS поза браузером, npm встановлює пакети. Перевірка: `node -v`, `npm -v`.
- package.json містить `scripts` (`npm run …`), `dependencies` і `devDependencies` (тестові інструменти, `-D`).
- `npm install` ставить усе з package.json у `node_modules`. `npx` запускає CLI пакета, `npm ci` встановлює точно за lock-файлом.
- `node_modules` не комітимо, `package-lock.json` комітимо.
- Помилки npm кажуть прямо: не та папка, одрук у скрипті, пакет не встановлено.
