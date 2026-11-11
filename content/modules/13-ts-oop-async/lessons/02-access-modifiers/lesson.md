# Модифікатори доступу, getters і setters

Якщо будь-хто може змінити будь-яке поле об'єкта, легко зламати його стан: баланс гаманця стане від'ємним, кількість повторів тесту — `-5`. **Інкапсуляція** ховає внутрішні дані і дозволяє змінювати їх лише через методи, які перевіряють правила.

## public, private, protected

```ts
class Wallet {
  public owner: string;          // anyone can read and write (default)
  private balance = 0;           // only inside this class
  protected currency = 'UAH';    // inside this class and its subclasses (lesson 3)

  constructor(owner: string) {
    this.owner = owner;
  }

  deposit(amount: number): void {
    if (amount <= 0) throw new Error('Amount must be positive');
    this.balance += amount;
  }

  getBalance(): number {
    return this.balance;
  }
}

const w = new Wallet('Olena');
w.deposit(100);
w.getBalance();   // 100
w.balance = -5;   // ❌ Property 'balance' is private
```

> [!NOTE]
> `private` — перевірка TypeScript. У JavaScript є власний синтаксис приватних полів `#balance`, який захищає і під час виконання. Обидва варіанти зустрічаються в коді.

## readonly і parameter properties

```ts
class TestUser {
  constructor(
    public readonly id: string,     // creates a public readonly field id
    private password: string,       // creates a private field password
  ) {}

  matches(password: string): boolean {
    return this.password === password;
  }
}
```

Модифікатор у параметрі конструктора — скорочення: TypeScript сам створить поле і присвоїть значення. Дуже поширено в Page Objects: `constructor(private readonly page: Page) {}`.

## Getters і setters

`get` і `set` виглядають як поле, але виконують код:

```ts
class RunConfig {
  private _retries = 0;

  get retries(): number {
    return this._retries;
  }

  set retries(value: number) {
    if (!Number.isInteger(value) || value < 0 || value > 5) {
      throw new RangeError('retries must be an integer from 0 to 5');
    }
    this._retries = value;
  }
}

const cfg = new RunConfig();
cfg.retries = 3;      // calls the setter
cfg.retries;          // 3 — calls the getter
cfg.retries = 10;     // RangeError
```

Getter без setter — **обчислюване** поле лише для читання:

```ts
class TestRun {
  constructor(private passed: number, private failed: number) {}
  get total(): number {
    return this.passed + this.failed;
  }
}
```

> [!QA]
> Сетер з перевіркою — це валідація на рівні коду. Тестуй його як форму: межі (0, 5, -1, 6), не той тип (2.5) і перевір, що після помилки старе значення **не змінилось**.

## Підсумок

- `public` (за замовчуванням), `private` (лише клас), `protected` (клас і нащадки), `readonly`.
- Parameter properties: `constructor(private readonly page: Page) {}`.
- `get` — читання як поле; `set` — запис з перевіркою.
- Інкапсуляція не дає зіпсувати стан об'єкта ззовні.
