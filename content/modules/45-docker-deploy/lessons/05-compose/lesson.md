# Docker Compose: застосунок і база

API рідко живе сам: йому потрібна база, іноді кеш чи черга. Запускати кожен контейнер окремою командою `docker run` з десятком прапорців — довго й легко помилитися. **Docker Compose** описує всі сервіси одним файлом `compose.yaml` і піднімає їх однією командою. Для розробника це головний спосіб мати локально «справжню» PostgreSQL замість SQLite.

## compose.yaml для фотогалереї

```yaml
services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://gallery:${POSTGRES_PASSWORD:?set it in .env}@db:5432/gallery
      LOG_LEVEL: INFO
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:18
    environment:
      POSTGRES_USER: gallery
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?set it in .env}
      POSTGRES_DB: gallery
    volumes:
      - pgdata:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gallery -d gallery"]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  pgdata:
```

## Розбір по ключах

| Ключ | Що означає |
|---|---|
| `services` | контейнери, що працюють разом; ключ — ім'я сервісу (`api`, `db`) |
| `build: .` | зібрати образ з Dockerfile у цій папці |
| `image: postgres:18` | взяти готовий образ з реєстру |
| `ports: - "8000:8000"` | як `-p`: комп'ютер → контейнер. Пиши **в лапках** — YAML може прочитати деякі пари чисел через двокрапку як число |
| `environment` | змінні середовища для контейнера |
| `${POSTGRES_PASSWORD:?…}` | підставити значення з оточення або з файлу `.env` поруч з `compose.yaml`; немає — compose зупиниться з цим повідомленням |
| `volumes: - pgdata:/var/lib/postgresql` | іменований том `pgdata` підключено в папку даних |
| `healthcheck` | команда, якою Docker перевіряє, що сервіс справді працює |
| `depends_on … service_healthy` | запускати `api`, лише коли `db` «здорова» |

## Мережа: назва сервісу — це ім'я хоста

Compose створює для проєкту спільну мережу, і контейнери знаходять один одного **за назвою сервісу**. Тому API звертається до бази за адресою `db:5432`, а не `localhost:5432`.

| Хто підключається | До чого | Адреса |
|---|---|---|
| `api` (контейнер) | база | `db:5432` — назва сервісу й порт **контейнера** |
| браузер на твоєму комп'ютері | API | `localhost:8000` — опублікований порт |
| pytest чи DBeaver на твоєму комп'ютері | база | лише якщо в `db` є `ports`, наприклад `"5433:5432"` → `localhost:5433` |
| `api` (контейнер) | сам себе | `localhost:8000` — `localhost` у контейнері означає сам контейнер |

> [!WARNING]
> Найчастіша помилка: `DATABASE_URL=...@localhost:5432/...` для контейнера API. Усередині контейнера `localhost` — це **сам контейнер API**, де жодної бази немає. Помилка виглядає як `connection refused`.

## Дані в томі

Без тому дані PostgreSQL жили б у контейнері й зникли б разом з ним. Іменований том `pgdata` живе окремо: `docker compose down` зупиняє й видаляє контейнери, а том лишається. `docker compose down -v` видаляє й томи — **разом з усіма даними**.

Два факти про образ `postgres`:

- змінні `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` діють лише при **першому** запуску з порожньою папкою даних. Змінив(ла) пароль у `.env`, а в томі вже є база — старий пароль лишився; допоможе `down -v` (дані зникнуть) або зміна пароля в самій базі;
- з версії 18 том підключають у `/var/lib/postgresql`; у старих інструкціях для 17 і раніше — `/var/lib/postgresql/data`.

## Порядок старту і healthcheck

`depends_on: [db]` лише запускає контейнер `db` раніше. Але PostgreSQL ще кілька секунд ініціалізується, і API, що одразу підключається, падає. `condition: service_healthy` чекає, доки `healthcheck` бази не стане успішним — `pg_isready` відповідає успіхом, коли сервер приймає з'єднання. Для такої умови в залежності **обов'язково** має бути `healthcheck`.

## Міграції

Таблиці створюють міграції (Alembic, `manage.py migrate`). Їх запускають окремою одноразовою командою з того самого образу:

```bash
docker compose run --rm api alembic upgrade head
docker compose run --rm api python manage.py migrate
```

`run` створює тимчасовий контейнер сервісу з іншою командою; `--rm` прибирає його після завершення.

## Команди

| Команда | Що робить |
|---|---|
| `docker compose up -d --build` | зібрати (якщо змінився код) і запустити все у фоні |
| `docker compose ps` | стан сервісів, зокрема `healthy` |
| `docker compose logs -f api` | логи сервісу |
| `docker compose exec db psql -U gallery` | консоль бази в запущеному контейнері |
| `docker compose run --rm api pytest` | одноразова команда в новому контейнері сервісу |
| `docker compose down` | зупинити й видалити контейнери (томи лишаються) |
| `docker compose down -v` | те саме + видалити томи з даними |

> [!TIP]
> Для розробки поруч кладуть `compose.override.yaml` — compose автоматично зливає його з `compose.yaml`. Там, наприклад, підключають папку з кодом і запускають `fastapi dev`, щоб зміни підхоплювалися без перезбирання, а основний файл лишається production-подібним. Ключ `version:` нагорі файлу більше не потрібен — compose попередить, що він застарів.

## Підсумок

- `compose.yaml` описує сервіси, їхні образи, порти, змінні, томи й залежності; `up -d --build` піднімає все.
- Контейнери звертаються один до одного за назвою сервісу (`db:5432`); `localhost` у контейнері — це він сам.
- Дані бази — в іменованому томі; `down -v` видаляє їх; змінні `POSTGRES_*` діють лише на порожньому томі.
- `depends_on` з `service_healthy` + `healthcheck` з `pg_isready` — API стартує, коли база готова.
- Секрети — через `${VAR:?}` з `.env`, міграції — окремою командою `compose run --rm`.
