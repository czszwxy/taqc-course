# Utility types

Один і той самий «користувач» в API має кілька форм: повна (з `id` і `password`), для створення (без `id`), для оновлення (усі поля необов'язкові), публічна (без `password`). Переписувати чотири інтерфейси — довго й ризиковано: додав поле в один — забув в інших. **Utility types** будують нові типи з наявних.

```ts
interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'customer';
}
```

## Основні utility types

| Тип | Результат | Для чого |
|---|---|---|
| `Partial<User>` | усі поля необов'язкові | тіло PATCH, зміни для оновлення |
| `Required<Config>` | усі поля обов'язкові | конфіг після застосування значень за замовчуванням |
| `Readonly<User>` | усі поля readonly | спільні тестові дані |
| `Pick<User, 'id' \| 'name'>` | лише вибрані поля | короткий вигляд у списку |
| `Omit<User, 'password'>` | усі поля, крім вказаних | публічна відповідь API, тіло POST без `id` |
| `Record<K, V>` | об'єкт з ключами K і значеннями V | словники, лічильники |
| `ReturnType<typeof fn>` | тип результату функції | коли тип не оголошено окремо |
| `NonNullable<T>` | `T` без `null` і `undefined` | після перевірки на наявність |

## Приклади

```ts
type NewUser = Omit<User, 'id'>;                 // body for POST /users
type UserChanges = Partial<Omit<User, 'id'>>;    // body for PATCH: any fields except id
type PublicUser = Omit<User, 'password'>;        // what the API may return
type UserPreview = Pick<User, 'id' | 'name'>;    // a list item

function updateUser(user: User, changes: UserChanges): User {
  return { ...user, ...changes };
}

updateUser(u, { name: 'Olena T.' });   // ✅
updateUser(u, { id: 2 });              // ❌ id is not allowed in changes
```

Utility types можна **комбінувати**: `Partial<Omit<User, 'id'>>` читається зсередини назовні — «User без id, де всі поля необов'язкові».

## Record з union-ключами

```ts
type Status = 'passed' | 'failed' | 'skipped';
const totals: Record<Status, number> = { passed: 0, failed: 0, skipped: 0 };
// forgetting a key or adding an unknown one is a compile error
```

## ReturnType

```ts
function createTestUser() {
  return { email: 'qa@gadgetly.test', password: 'Test1234', role: 'customer' as const };
}
type TestUser = ReturnType<typeof createTestUser>;
// { email: string; password: string; role: 'customer' }
```

> [!QA]
> Utility types тримають тестові типи **синхронними** з основними. Якщо в `User` з'явиться нове поле, `Omit<User, 'password'>` отримає його автоматично — і тести, які будують публічного користувача, одразу покажуть, де його бракує.

## Підсумок

- `Partial` / `Required` / `Readonly` змінюють усі поля одразу.
- `Pick` — вибрати поля, `Omit` — прибрати поля.
- `Record<K, V>` з union-ключами вимагає всіх ключів.
- `ReturnType<typeof fn>` виводить тип з функції; utility types комбінуються.
