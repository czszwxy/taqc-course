# Наслідування та абстрактні класи

У кожної сторінки сайту є спільне: адреса, заголовок, шапка з меню. Писати це в кожному Page Object знову — дублювання. **Наслідування** дозволяє винести спільне в базовий клас, а в конкретних класах описати лише відмінності.

## extends і super

```ts
class BasePage {
  actions: string[] = [];

  constructor(protected readonly url: string) {}

  open(): void {
    this.actions.push(`goto ${this.url}`);
  }

  title(): string {
    return 'Gadgetly';
  }
}

class LoginPage extends BasePage {
  constructor() {
    super('/login');          // call the parent constructor FIRST
  }

  login(email: string, password: string): void {
    this.actions.push(`fill email: ${email}`, `fill password: ${password}`, 'click Log in');
  }
}

const page = new LoginPage();
page.open();                  // inherited from BasePage
page.login('qa@gadgetly.test', 'Test1234');
page instanceof BasePage;     // true
```

- `class B extends A` — B отримує всі поля й методи A.
- У конструкторі нащадка **спочатку** `super(...)`, лише потім `this`.
- `protected` поля бачать і базовий клас, і нащадки.

## override — перевизначення

```ts
class LoginPage extends BasePage {
  override title(): string {
    return `${super.title()} — Login`;    // reuse the parent version
  }
}
```

Ключове слово `override` не обов'язкове, але корисне: якщо в базовому класі метод перейменують, TypeScript підкаже, що перевизначати більше нічого.

## Абстрактні класи

`abstract class` не можна створити через `new` — він лише шаблон. **Абстрактний метод** не має тіла, і кожен нащадок **зобов'язаний** його реалізувати:

```ts
abstract class FieldValidator {
  constructor(readonly field: string) {}

  abstract check(value: string): string | null;   // no body

  validate(value: string): string | null {         // shared logic
    const problem = this.check(value);
    return problem ? `${this.field}: ${problem}` : null;
  }
}

class RequiredValidator extends FieldValidator {
  check(value: string): string | null {
    return value.trim() ? null : 'is required';
  }
}

new FieldValidator('x');                    // ❌ Cannot create an instance of an abstract class
new RequiredValidator('email').validate(''); // 'email: is required'
```

## Поліморфізм

Різні класи з однаковим «інтерфейсом» можна обробляти однаково:

```ts
const validators: FieldValidator[] = [new RequiredValidator('email'), new MaxLengthValidator('name', 50)];
const errors = validators.map((v) => v.validate(input)).filter((e) => e !== null);
```

Код викликає `validate` і не знає, який саме клас усередині — кожен поводиться по-своєму.

> [!QA]
> Типова структура тестового фреймворку: `BasePage` (відкрити, дочекатися завантаження, шапка, футер) → `LoginPage`, `CartPage`, `CheckoutPage`. Але не захоплюйся: глибокі ланцюжки наслідування (5 рівнів) важко читати. Часто краще **композиція**: сторінка має поле `header: HeaderComponent`.

## Підсумок

- `extends` успадковує поля й методи; у конструкторі нащадка спершу `super()`.
- `override` перевизначає метод; `super.method()` викликає батьківську версію.
- `abstract class` — шаблон без `new`; `abstract` методи реалізують нащадки.
- Поліморфізм: один код для різних класів зі спільним базовим типом.
