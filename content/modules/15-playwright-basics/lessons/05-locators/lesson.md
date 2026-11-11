# Локатори: getByRole, getByLabel, getByText, getByTestId

**Локатор** — це інструкція «як знайти елемент». Він не шукає елемент одразу: пошук відбувається в момент дії чи перевірки, і Playwright повторює його, поки елемент не з'явиться. Тому локатор можна зберегти в змінну й використовувати багато разів.

```ts
const email = page.getByLabel('Email');
await email.fill('demo@taskly.test');
await expect(email).toHaveValue('demo@taskly.test');
```

## Шукай так, як шукає користувач

Користувач не бачить класів і `div`-ів. Він бачить **кнопку «Log in»**, **поле з підписом Email**, **заголовок**. Локатори, що спираються на це, не ламаються, коли розробник змінить верстку.

| Локатор | Коли | Приклад |
|---|---|---|
| `getByRole(role, { name })` | кнопки, посилання, заголовки, чекбокси, поля — **перший вибір** | `page.getByRole('button', { name: 'Log in' })` |
| `getByLabel(text)` | поля форми з підписом | `page.getByLabel('Email')` |
| `getByPlaceholder(text)` | поле без підпису, але з placeholder | `page.getByPlaceholder('What needs to be done?')` |
| `getByText(text)` | текст, який не є кнопкою чи полем | `page.getByText('Passwords do not match')` |
| `getByAltText` / `getByTitle` | картинки, елементи з title | `page.getByAltText('Gadgetly logo')` |
| `getByTestId(id)` | коли нічого кращого немає, а розробники додали `data-testid` | `page.getByTestId('signed-in-as')` |

## Ролі

Кожен елемент має **роль** у дереві доступності (accessibility tree, модуль 07):

| HTML | Роль |
|---|---|
| `<button>`, `<input type="submit">` | `button` |
| `<a href>` | `link` |
| `<h1>`…`<h6>` | `heading` |
| `<input type="text">`, `<textarea>` | `textbox` |
| `<input type="checkbox">` | `checkbox` |
| `<select>` | `combobox` |
| `<li>` | `listitem` |
| елемент з `role="alert"` | `alert` |

`name` — це **доступне ім'я**: текст кнопки, підпис поля, `aria-label`.

```ts
page.getByRole('heading', { name: 'Sign in to Taskly' });
page.getByRole('checkbox', { name: 'Remember me' });
page.getByRole('alert');   // повідомлення про помилку з role="alert"
```

> [!TIP]
> Якщо `getByRole` не знаходить елемент, значить він погано доступний для скрінрідерів. Це сигнал і для accessibility-тестування.

## Частковий і точний збіг

Рядок у `name`, `getByLabel`, `getByText` за замовчуванням шукається **частково і без урахування регістру**:

```ts
page.getByLabel('Password');                    // знайде "Password" І "Confirm password"!
page.getByLabel('Password', { exact: true });   // лише "Password"
page.getByRole('heading', { name: /Welcome/ }); // регулярний вираз
```

## Strict mode

Якщо локатор знаходить **кілька** елементів, а ти робиш дію (`click`, `fill`) чи перевірку одного елемента, Playwright зупиняється з помилкою:

```text
Error: strict mode violation: getByLabel('Password') resolved to 2 elements
```

Це захист: тест не клікне «якусь» кнопку з кількох. Розв'язок — уточнити локатор: `exact: true`, роль, контейнер (урок 6).

## getByTestId

`data-testid="signed-in-as"` — атрибут спеціально для тестів, домовленість із розробниками. Він стабільний, бо його не змінюють заради дизайну. Мінус: користувач його не бачить, тож тест не перевіряє, чи елемент зрозумілий людині. Порядок вибору: **роль → підпис/текст → test id → CSS/XPath** (урок 6).

> [!QA]
> Локатор — частина тест-кейсу. `page.locator('#root > div > div:nth-child(2) > button')` перестане працювати після першого редизайну. `getByRole('button', { name: 'Log in' })` переживе редизайн і зламається лише тоді, коли кнопка справді зникне чи перейменується, а це вже привід перевірити вимоги.

## Підсумок

- Локатор — це ліниві інструкції пошуку. Пошук відбувається під час дії або перевірки, з повторами.
- Порядок вибору: `getByRole` → `getByLabel` / `getByPlaceholder` / `getByText` → `getByTestId` → CSS/XPath.
- `name` у `getByRole` — це текст кнопки, підпис чи `aria-label`. Пошук частковий і без регістру, для точного є `{ exact: true }`.
- Strict mode не дає діяти, якщо локатор знайшов кілька елементів. Тоді уточни локатор.
