# Обробка помилок і власні помилки

Для автотесту помилка — це головний сигнал: **тест падає, коли щось кидає помилку**. `expect(...)` теж просто кидає помилку, якщо перевірка не пройшла. Тому тестувальнику треба добре розуміти, як помилки виникають, як їх перехоплювати і коли перехоплювати **не можна**.

## throw

```ts
function validateAge(age: number): void {
  if (age < 18) {
    throw new Error('Age must be at least 18');
  }
}
```

`throw` зупиняє функцію і «піднімає» помилку вгору по ланцюжку викликів, поки її не перехоплять. Якщо не перехопить ніхто — програма (або тест) падає.

## try / catch / finally

```ts
try {
  validateAge(16);
  console.log('valid');          // not reached
} catch (error) {
  console.log('invalid:', error instanceof Error ? error.message : String(error));
} finally {
  console.log('always runs');    // even if there was an error or a return
}
```

- `catch (error)` — у strict TypeScript тип `error` — **`unknown`**: кинути можна що завгодно (`throw 'oops'`). Перед `error.message` перевір `error instanceof Error`.
- `finally` виконується **завжди** — ідеальне місце для прибирання (закрити з'єднання, видалити тестові дані).

## Власні класи помилок

```ts
class ValidationError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

try {
  throw new ValidationError('age', 'Age must be at least 18');
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(error.field);      // 'age' — extra data
  } else {
    throw error;                   // not ours — rethrow!
  }
}
```

Власні помилки несуть **додаткові дані** (поле, статус-код) і дозволяють відрізнити очікувану помилку від справжнього збою через `instanceof`.

## Повторні спроби

```ts
function retry<T>(fn: () => T, attempts: number): T {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return fn();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
```

> [!WARNING]
> Найгірше, що можна зробити в тесті, — «проковтнути» помилку: `try { … } catch {}` без нічого. Тест стане зеленим, а баг залишиться непоміченим. Перехоплюй помилку лише тоді, коли знаєш, що з нею робити; інакше дай тесту впасти.

> [!QA]
> У тестах перевіряють, що функція **кидає** правильну помилку: `expect(() => validateAge(16)).toThrow('at least 18')` або `toThrow(ValidationError)`. А `retries` у Playwright — це вбудований retry для нестабільних тестів (модуль 15).

## Підсумок

- `throw new Error(...)` зупиняє виконання і піднімає помилку вгору.
- `try/catch/finally`; у `catch` помилка має тип `unknown` — перевір `instanceof Error`.
- Власні помилки: `class X extends Error` з додатковими полями і `this.name`.
- Не ковтай помилки; перекидай (`throw error`) ті, які не вмієш обробити.
