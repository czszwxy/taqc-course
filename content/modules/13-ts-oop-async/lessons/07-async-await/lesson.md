# async/await і Promise.all

`async/await` — той самий Promise, але записаний так, ніби код синхронний. Саме так виглядає кожен тест Playwright:

```ts
test('user can log in', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('qa@gadgetly.test');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByText('Welcome back!')).toBeVisible();
});
```

## async і await

```ts
async function orderTotal(orderId: number): Promise<number> {
  const order = await getOrder(orderId);          // wait for the Promise, get the value
  const product = await getProduct(order.productId);
  return product.price * order.quantity;          // becomes Promise<number>
}
```

- `async` перед функцією → вона **завжди** повертає Promise.
- `await promise` «чекає» результат і повертає значення (або кидає помилку, якщо Promise rejected).
- `await` можна писати лише всередині `async`-функцій.

## Помилки: try/catch

```ts
async function orderTotalOrNull(orderId: number): Promise<number | null> {
  try {
    const order = await getOrder(orderId);
    const product = await getProduct(order.productId);
    return product.price * order.quantity;
  } catch {
    return null;
  }
}
```

> [!WARNING]
> Забутий `await` — найчастіша помилка в тестах Playwright. Без нього дія лише **запускається**, тест іде далі, не чекаючи, і перевіряє сторінку раніше, ніж клік стався. Результат — «нестабільний» тест. ESLint-правило `@typescript-eslint/no-floating-promises` ловить такі місця.

## Послідовно чи паралельно

```ts
// sequential: ~3 × 100 ms = 300 ms
const a = await getUser(1);
const b = await getUser(2);
const c = await getUser(3);

// parallel: ~100 ms — all requests start at once
const [x, y, z] = await Promise.all([getUser(1), getUser(2), getUser(3)]);
const users = await Promise.all(ids.map((id) => getUser(id)));
```

`Promise.all` чекає **всі** Promise і повертає масив результатів **у тому ж порядку**. Якщо хоч один упав — увесь `Promise.all` rejected.

> [!TIP]
> Паралельно — лише **незалежні** дії. Якщо другий крок потребує результату першого (спершу логін, потім замовлення з токеном), — послідовно.

## Promise.allSettled

Коли потрібні результати **всіх**, навіть якщо деякі впали:

```ts
const results = await Promise.allSettled([ping('api'), ping('payments')]);
// [{ status: 'fulfilled', value: 42 }, { status: 'rejected', reason: Error }]
```

## Promise.race і таймаут

`Promise.race` — перший, хто завершився (успіхом чи помилкою):

```ts
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms} ms`)), ms));
  return Promise.race([promise, timeout]);
}
```

> [!QA]
> Кожна дія і перевірка в Playwright має таймаут — саме за таким принципом. Помилка `Timeout 5000ms exceeded` означає: Promise (наприклад, «елемент став видимим») не виконався вчасно.

## Підсумок

- `async` функція повертає Promise; `await` дістає значення або кидає помилку.
- Асинхронні помилки ловить `try/catch` навколо `await`.
- Незалежні дії — паралельно через `Promise.all`; залежні — послідовно.
- `allSettled` — результати всіх; `race` — перший; таймаут = `race` з таймером.
