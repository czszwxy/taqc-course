# Класи

Досі ти описувала дані (інтерфейси) і дії (функції) окремо. **Клас** об'єднує їх: дані (поля) і поведінку (методи) одного «предмета». В автотестах класи — основа **Page Object Model**: кожна сторінка сайту стає класом з полями-локаторами і методами-діями.

```ts
class LoginPage {
  url = '/login';

  open(): string {
    return `Opening ${this.url}`;
  }
}

const page = new LoginPage();   // an instance (object) of the class
page.open();                    // 'Opening /login'
```

## Поля і конструктор

```ts
class BugReport {
  id: number;
  title: string;
  status = 'New';                 // field with an initial value

  constructor(id: number, title: string) {
    this.id = id;                 // this = the object being created
    this.title = title;
  }
}

const bug = new BugReport(12, 'Total is wrong');
bug.status;   // 'New'
```

`constructor` викликається під час `new` і заповнює поля. У strict-режимі TypeScript вимагає, щоб кожне поле отримало значення (у полі або в конструкторі).

## Методи і this

```ts
class BugReport {
  // …
  assignee: string | null = null;

  assign(name: string): void {
    this.assignee = name;
    this.status = 'Assigned';
  }

  isOpen(): boolean {
    return this.status !== 'Closed';
  }
}
```

`this` усередині методу — це конкретний об'єкт, на якому метод викликали: `bug.assign('Andrii')` змінює саме `bug`.

> [!WARNING]
> Якщо передати метод як колбек (`setTimeout(bug.close, 100)`), `this` «губиться». Рішення — стрілка: `setTimeout(() => bug.close(), 100)`.

## Кожен екземпляр — окремий

```ts
const a = new BugReport(1, 'A');
const b = new BugReport(2, 'B');
a.assign('Olena');
b.status;   // still 'New'
```

## Статичні члени

`static` належить **класу**, а не екземпляру — спільний для всіх:

```ts
class UserFactory {
  static nextId = 1;

  static create(role: string): { id: number; email: string } {
    const id = UserFactory.nextId++;
    return { id, email: `${role}${id}@gadgetly.test` };
  }
}

UserFactory.create('admin');   // { id: 1, email: 'admin1@gadgetly.test' }
UserFactory.create('admin');   // { id: 2, … }
```

> [!QA]
> Фабрики тестових даних з унікальними email — типовий static-клас у тестових проєктах. Унікальні дані роблять тести незалежними: два тести не «б'ються» за одного користувача.

## Клас vs інтерфейс

| | `interface` | `class` |
|---|---|---|
| Існує під час виконання | ❌ | ✅ |
| Має реалізацію методів | ❌ | ✅ |
| Створюється через `new` | ❌ | ✅ |
| `instanceof` працює | ❌ | ✅ |

## Підсумок

- Клас = поля + конструктор + методи; екземпляр створює `new`.
- `this` у методі — поточний об'єкт; у колбеках використовуй стрілки.
- Екземпляри незалежні; `static` — спільне для класу.
- Класи — основа Page Object Model в автотестах.
