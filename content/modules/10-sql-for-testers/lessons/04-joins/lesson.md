# JOIN-и: поєднання таблиць

Дані розкладені по різних таблицях: замовлення в `orders`, імена клієнтів у `users`, назви товарів у `products`. Питання «на яку суму замовила Olena?» або «які товари в замовленні 1009?» вимагають **поєднати** таблиці. Це робить `JOIN`.

## INNER JOIN

```sql
SELECT orders.id, users.email, orders.status
FROM orders
JOIN users ON users.id = orders.user_id;
```

`JOIN … ON` бере кожен рядок `orders` і приєднує до нього рядок `users`, для якого виконується умова `ON`: «id користувача = user_id замовлення». Умова майже завжди поєднує **foreign key** з **primary key**.

`JOIN` — це скорочення від `INNER JOIN`: у результат потрапляють лише рядки, **для яких знайшлася пара**.

## Псевдоніми таблиць

Щоб не писати довгі назви, таблицям дають короткі псевдоніми:

```sql
SELECT o.id, u.name, o.total
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE u.city = 'Lviv';
```

Якщо колонка з такою назвою є в обох таблицях (`id`, `created_at`), її **обов'язково** уточнюють: `o.id` чи `u.id`. Інакше буде помилка «ambiguous column name».

## Кілька таблиць

```sql
-- склад замовлення 1009 з назвами товарів
SELECT p.name, i.quantity, i.unit_price
FROM order_items i
JOIN products p ON p.id = i.product_id
WHERE i.order_id = 1009;
```

JOIN-и можна ланцюжити: `order_items → orders → users` і `order_items → products`. Кожен `JOIN` має свій `ON`.

## LEFT JOIN — «усі зліва, навіть без пари»

`INNER JOIN` губить рядки без пари. Користувачі 7, 9 і 10 ще нічого не замовляли, тож у `users JOIN orders` їх просто немає. `LEFT JOIN` залишає **всі** рядки лівої таблиці, а колонки правої для них заповнює `NULL`:

```sql
SELECT u.id, u.name, o.id AS order_id
FROM users u
LEFT JOIN orders o ON o.user_id = u.id;
```

| u.id | name | order_id |
|---|---|---|
| 1 | Olena Kovalenko | 1001 |
| 1 | Olena Kovalenko | 1002 |
| … | … | … |
| 7 | QA Admin | *NULL* |
| 9 | Daryna Moroz | *NULL* |

## Пошук рядків без пари

Головний прийом тестувальника з `LEFT JOIN`: залиш лише ті рядки, де пари **немає**:

```sql
-- користувачі без жодного замовлення
SELECT u.id, u.email
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.id IS NULL;
```

Так само знаходять товари, які ніколи не купували, замовлення без позицій і «осиротілі» записи, що посилаються на неіснуючий рядок.

> [!QA]
> Звіт «Клієнти без замовлень» показує 2 людини, а запит з `LEFT JOIN … IS NULL` знаходить 3. Різниця може бути в адміні (роль `admin`) або в баґу звіту. Запит дає точний список, і його можна вставити в баг-репорт.

## JOIN + GROUP BY і COALESCE

```sql
-- скільки замовлень у кожного користувача, включно з нулями
SELECT u.name, COUNT(o.id) AS orders_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.name;
```

> [!WARNING]
> Тут потрібен `COUNT(o.id)`, а не `COUNT(*)`. Для користувача без замовлень `LEFT JOIN` дає **один** рядок з `NULL`. `COUNT(*)` порахує його як 1, а `COUNT(o.id)` пропустить NULL і дасть правильний 0.

`SUM` по порожній групі дає `NULL`, а не 0. `COALESCE(x, 0)` повертає перше не-NULL значення, тобто 0, якщо `x` дорівнює NULL:

```sql
SELECT u.email, COALESCE(SUM(o.total), 0) AS spent
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.email;
```

## Пастка: розмноження рядків

Якщо приєднати таблицю, де на один рядок припадає кілька пар, рядки «розмножуються». У замовлення 1009 три позиції, тож `orders JOIN order_items` дасть три рядки з тим самим `total`. Тоді `SUM(o.total)` порахує суму тричі. Спершу виконай JOIN без агрегатів і подивись, скільки рядків вийшло.

## Підсумок

- `JOIN … ON` поєднує таблиці, зазвичай за умовою FK = PK. `JOIN` означає `INNER JOIN`: лише рядки з парою.
- Псевдоніми (`orders o`) скорочують запит. Однакові назви колонок уточнюй: `o.id`, `u.id`.
- `LEFT JOIN` залишає всі рядки лівої таблиці. Де пари немає, колонки правої таблиці дорівнюють NULL.
- `LEFT JOIN … WHERE права.id IS NULL` знаходить рядки без пари.
- З `LEFT JOIN` рахуй `COUNT(права.id)`, а `NULL` заміняй через `COALESCE(x, 0)`.
- JOIN «один-до-багатьох» розмножує рядки. Пам'ятай про це, коли рахуєш суми.
