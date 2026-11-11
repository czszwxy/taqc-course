# Хуки, тестові дані та незалежність тестів

## Незалежність — головне правило

Кожен тест має проходити **сам по собі**: в будь-якому порядку, окремо, паралельно з іншими. Якщо тест B проходить лише тому, що тест A перед ним додав товар у кошик, — це бомба сповільненої дії:

- запустиш лише B (щоб налагодити) — він упаде;
- тести запустять паралельно (Playwright робить це за замовчуванням) — випадкові падіння;
- A змінять — зламається B, хоча його ніхто не чіпав.

```ts
// ❌ shared state between tests
const list = new TodoList();
it('adds a task', () => { list.add('Buy milk'); expect(list.items).toHaveLength(1); });
it('counts active tasks', () => { expect(list.activeCount()).toBe(1); });   // depends on the test above!
```

## beforeEach — свіжий стан для кожного тесту

```ts
describe('TodoList', () => {
  let list: TodoList;

  beforeEach(() => {
    list = new TodoList();          // a NEW list before EVERY test
  });

  it('adds a task', () => {
    list.add('Buy milk');
    expect(list.items).toHaveLength(1);
  });

  it('counts only active tasks', () => {
    const t = list.add('A');
    list.add('B');
    list.complete(t.id);
    expect(list.activeCount()).toBe(1);   // its own data — no dependency
  });
});
```

| Хук | Коли виконується | Для чого |
|---|---|---|
| `beforeEach` | перед **кожним** тестом блоку | свіжий об'єкт, відкрита сторінка, логін |
| `afterEach` | після **кожного** тесту | прибирання: видалити створені дані, скинути моки |
| `beforeAll` | один раз перед усіма тестами блоку | дорога підготовка, яку тести **не змінюють** |
| `afterAll` | один раз після всіх | закрити з'єднання, видалити спільні дані |

Хуки діють у своєму `describe` і вкладених у нього.

> [!WARNING]
> `beforeAll` + зміна спільних даних у тестах = залежні тести. Якщо тести щось змінюють, готуй дані в `beforeEach`.

## Тестові дані

- **Конкретні й читабельні**: `'Buy milk'`, `'qa@gadgetly.test'`, а не `'asdf'`, `'test1'`.
- **Унікальні**, коли зберігаються на сервері: два тести не повинні створювати користувача з тим самим email.
- **Мінімальні**: лише те, що важливо для тесту; решту бере фабрика.

**Фабрика тестових даних** дає валідний об'єкт за замовчуванням і дозволяє змінити лише потрібне:

```ts
let counter = 0;

function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  counter += 1;
  return {
    name: 'Test User',
    email: `user${counter}@gadgetly.test`,
    password: 'Test1234',
    role: 'customer',
    ...overrides,                       // the test changes only what matters
  };
}

const admin = createTestUser({ role: 'admin' });
const noPassword = createTestUser({ password: '' });
```

> [!QA]
> У Playwright замість `beforeEach` часто використовують **фікстури** (модуль 16): `test('…', async ({ page, loggedInUser }) => …)`. Принцип той самий — кожен тест отримує свіжий, підготовлений стан.

## Підсумок

- Тести незалежні: будь-який порядок, окремо, паралельно.
- `beforeEach` створює свіжий стан; `afterEach` прибирає; `beforeAll`/`afterAll` — для того, що тести не змінюють.
- Тестові дані: конкретні, унікальні, мінімальні.
- Фабрика + `overrides` = валідні дані за замовчуванням, змінюєш лише важливе.
