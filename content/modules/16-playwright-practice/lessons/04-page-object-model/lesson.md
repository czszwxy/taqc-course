# Page Object Model

Уяви 30 тестів, які заповнюють форму реєстрації. Розробник перейменував кнопку «Create account» на «Sign up», і 30 тестів упали. У кожному треба виправити локатор. **Page Object Model (POM)** розв'язує це: усі локатори й дії сторінки живуть в одному класі, а тести користуються його методами.

## Клас сторінки

```ts
import { type Locator, type Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly error: Locator;

  constructor(page: Page) {
    this.page = page;
    this.email = page.getByLabel('Email');
    this.password = page.getByLabel('Password', { exact: true });
    this.submit = page.getByRole('button', { name: 'Log in' });
    this.error = page.getByRole('alert');
  }

  async goto(): Promise<void> {
    await this.page.goto('/playground/login');
  }

  async logIn(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
```

- `constructor` отримує `page` і описує **локатори**. Локатори ліниві (модуль 15), тож створювати їх у конструкторі безпечно.
- Методи — **дії користувача** мовою предметної області: `logIn`, `addToCart`, `applyPromo`.
- Клас лежить у `pages/LoginPage.ts` і експортується.

## Тести стають сценаріями

```ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test('wrong password shows an error', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.logIn('demo@taskly.test', 'wrong');
  await expect(login.error).toHaveText('Invalid email or password');
});
```

Тест читається як тест-кейс: відкрити, увійти з неправильним паролем, побачити помилку.

## Що в Page Object, а що в тесті

| У Page Object | У тесті |
|---|---|
| локатори | **перевірки** (`expect`) |
| дії: `logIn`, `register`, `applyPromo` | тестові дані (який email, яка сума) |
| навігація (`goto`) | рішення, **що** перевіряти |

> [!WARNING]
> Не ховай `expect` усередину методів на кшталт `logInAndCheckSuccess()`. Тоді метод не підходить для негативних тестів, а у звіті незрозуміло, яка перевірка впала. Виняток — перевірка, що сторінка відкрилася (`await expect(this.heading).toBeVisible()` у `goto`).

## Компоненти

Повторювані частини (шапка, кошик-віджет, картка товару) оформлюють окремими класами-компонентами і вкладають у сторінки:

```ts
export class ProductCard {
  constructor(readonly root: Locator) {}
  get addToCart(): Locator {
    return this.root.getByRole('button', { name: 'Add to cart' });
  }
}
```

## Структура проєкту

```text
tests/
  login.spec.ts
  cart.spec.ts
pages/
  LoginPage.ts
  CartPage.ts
  components/ProductCard.ts
fixtures/
  index.ts        ← урок 5: фікстури, що створюють Page Objects
```

> [!QA]
> POM — не самоціль. Для 3 тестів він зайвий. Для 300 рятує тижні підтримки. На співбесіді часто просять «показати Page Object». Пам'ятай три тези: один клас = одна сторінка, тест містить перевірки, локатори — в одному місці.

## Підсумок

- Page Object — клас сторінки: `constructor(page)` з локаторами + методи-дії мовою предметної області.
- Тести створюють `new LoginPage(page)` і читаються як сценарії. Зміна верстки виправляється в одному місці.
- Перевірки (`expect`) і тестові дані лишаються в тестах.
- Повторювані частини оформлюють компонентами, класи кладуть у `pages/`.
