# Умови: if, switch, тернарний оператор

Програма має вміти **приймати рішення**: «якщо тест упав — позначити прогон як FAILED», «якщо статус-код 500 — зробити скриншот». Для цього існують умовні конструкції.

## if / else

```ts
const failed = 2;

if (failed > 0) {
  console.log('Run FAILED');
} else {
  console.log('Run PASSED');
}
```

- У дужках `( )` — **умова**, будь-який вираз, що дає `true`/`false` (або truthy/falsy).
- У фігурних дужках `{ }` — **блок**, який виконується, якщо умова істинна.
- `else` — необов'язковий блок «інакше».

## else if: кілька варіантів

Умови перевіряються **зверху вниз**, і виконується тільки **перший** блок, умова якого виявилась істинною:

```ts
function getGrade(score: number): string {
  if (score >= 90) {
    return 'A';
  } else if (score >= 75) {
    return 'B';
  } else if (score >= 60) {
    return 'C';
  } else {
    return 'F';
  }
}
```

> [!WARNING]
> Порядок умов має значення. Якщо першою поставити `score >= 60`, то й 95 балів дадуть `'C'`: перша ж умова виявиться істинною, і до решти справа не дійде.

## Ранній return

Коли функція повертає результат, `else` часто не потрібен: `return` одразу завершує функцію.

```ts
function getRunStatus(failed: number): string {
  if (failed > 0) {
    return 'FAILED';   // далі функція не виконується
  }
  return 'PASSED';
}
```

Такий стиль (early return, guard clause) читається легше, ніж глибока вкладеність `if` в `if`.

## Складні умови

Умови комбінуються через `&&`, `||`, `!`:

```ts
if (statusCode >= 200 && statusCode < 300) {
  console.log('Success');
}

if (!isLoggedIn || isSessionExpired) {
  console.log('Redirect to login');
}
```

## switch: вибір з набору значень

Коли значення порівнюється з кількома **конкретними** варіантами, `switch` читається краще, ніж ланцюжок `else if`:

```ts
function getStatusText(code: number): string {
  switch (code) {
    case 200:
      return 'OK';
    case 201:
      return 'Created';
    case 404:
      return 'Not Found';
    case 500:
    case 502:
    case 503:
      return 'Server error'; // кілька case для одного результату
    default:
      return 'Unknown';
  }
}
```

- `case` порівнює значення через `===`.
- `default` спрацьовує, якщо жоден `case` не підійшов.
- Якщо в `case` немає `return`, потрібен `break`, інакше виконання «провалиться» в наступний `case`:

```ts
switch (env) {
  case 'dev':
    url = 'http://localhost:3000';
    break;            // без break виконався б і наступний case!
  case 'staging':
    url = 'https://staging.example.com';
    break;
  default:
    url = 'https://example.com';
}
```

## Тернарний оператор

Короткий запис `if/else`, який **повертає значення**:

```ts
const label = failed > 0 ? 'FAILED' : 'PASSED';
//            умова      ? якщо true : якщо false
```

Зручно для простих виборів. Вкладені тернарні оператори (`a ? b : c ? d : e`) читаються погано, тому в таких випадках краще використати `if`.

## Перевірки рядків і чисел без сюрпризів

```ts
if (input.trim() === '') { /* порожнє поле */ }
if (Number.isInteger(age)) { /* ціле число */ }
if (severity.toLowerCase() === 'critical') { /* без урахування регістру */ }
```

`Number.isInteger(x)` повертає `true` тільки для цілих чисел: `Number.isInteger(18)` → `true`, а `Number.isInteger(18.5)` → `false`.

> [!QA]
> Кожна гілка `if`/`case` — це окремий сценарій, який треба перевірити. У функції з 4 гілками мінімум 4 тест-кейси. Плюс **межі** між гілками: для `score >= 90` перевір 89 і 90. Так виглядає ідея **branch coverage** (покриття гілок).

## Підсумок

- `if / else if / else` — умови перевіряються зверху вниз, виконується перший істинний блок.
- **Early return** зменшує вкладеність.
- `switch` — для порівняння з набором конкретних значень. Не забувай `break` або `return`.
- Тернарний `умова ? a : b` — для простих виборів значення.
- Кожна гілка й кожна межа між гілками — кандидат у тест-кейс.
