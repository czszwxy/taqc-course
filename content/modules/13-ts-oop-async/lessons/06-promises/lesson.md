# Event loop, колбеки і Promise

**Усе** в Playwright асинхронне: відкрити сторінку, клікнути, дочекатися відповіді сервера. Кожен рядок тесту починається з `await`. Щоб розуміти, що відбувається (і чому тести бувають «нестабільними»), треба знати, як JavaScript працює з речами, що тривають у часі.

## Один потік і event loop

JavaScript виконує код **в одному потоці**: одна дія за раз. Довгі операції (таймер, запит до сервера, читання файлу) не блокують його: JavaScript **реєструє** «що зробити, коли буде готово», і йде далі. Коли операція завершується, її обробник ставиться в **чергу**, а **event loop** бере звідти задачі, щойно поточний код закінчився.

```ts
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
// 1, 4, 3, 2
```

Чому так: спочатку виконується весь синхронний код (`1`, `4`). Потім — **мікрозадачі** (обробники Promise: `3`). Потім — **макрозадачі** (таймери: `2`), навіть із затримкою `0`.

## Колбеки

Старий спосіб: передати функцію, яку викличуть «потім».

```ts
loadUserLegacy(42, (error, user) => {
  if (error) return console.log('failed', error.message);
  console.log(user.name);
});
```

Кілька кроків поспіль перетворюються на «пекло колбеків» — вкладені функції, де легко загубити обробку помилок:

```ts
login(user, (e1, token) => {
  getOrders(token, (e2, orders) => {
    getProduct(orders[0].productId, (e3, product) => { … });
  });
});
```

## Promise

**Promise** — об'єкт-«обіцянка» майбутнього результату. Має три стани:

| Стан | Значення |
|---|---|
| `pending` | ще виконується |
| `fulfilled` | успіх, є значення |
| `rejected` | помилка, є причина |

```ts
const p = new Promise<number>((resolve, reject) => {
  setTimeout(() => resolve(42), 100);      // or reject(new Error('…'))
});

p.then((value) => console.log(value))      // 42
  .catch((error) => console.log(error))    // on any error above
  .finally(() => console.log('done'));     // always
```

`then` повертає **новий** Promise, тож кроки йдуть ланцюжком, а одна `catch` в кінці ловить помилку з будь-якого кроку:

```ts
login(user)
  .then((token) => getOrders(token))
  .then((orders) => getProduct(orders[0].productId))
  .then((product) => console.log(product.price))
  .catch((error) => console.log('something failed:', error.message));
```

## Колбек → Promise

Старі API з колбеками загортають у Promise:

```ts
function loadUser(id: number): Promise<User> {
  return new Promise((resolve, reject) => {
    loadUserLegacy(id, (error, user) => {
      if (error || !user) reject(error ?? new Error('No user'));
      else resolve(user);
    });
  });
}
```

> [!QA]
> Класична причина нестабільних тестів — перевірка «до того, як дані прийшли»: тест читає список, поки запит ще `pending`. Playwright має автоочікування, але розуміння асинхронності допомагає швидко знайти такі місця.

## Підсумок

- JavaScript однопотоковий; event loop виконує обробники, коли поточний код завершився.
- Порядок: синхронний код → мікрозадачі (Promise) → макрозадачі (таймери).
- Promise: pending → fulfilled / rejected; `then`, `catch`, `finally`, ланцюжки.
- Колбек-API загортають у `new Promise((resolve, reject) => …)`.
