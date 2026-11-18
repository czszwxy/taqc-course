# CI/CD: тести, збирання, публікація

CI (continuous integration) перевіряє кожну зміну: тести, лінтери. CD (continuous delivery / deployment) іде далі — збирає з перевіреного коду **образ**, публікує його в реєстр і доставляє на сервер. Принцип, на якому все тримається: **образ збирається один раз**, а потім той самий образ потрапляє на staging і в production — відрізняються лише змінні середовища.

## Як читати workflow

GitHub Actions виконує YAML-файли з папки `.github/workflows/`. Головні ключі:

| Ключ | Що означає |
|---|---|
| `on` | коли запускати: `push`, `pull_request`, теги, вручну (`workflow_dispatch`) |
| `jobs` | незалежні завдання; кожне — на чистій віртуальній машині (`runs-on: ubuntu-latest`) |
| `needs` | job чекає на інший і запускається лише після його успіху |
| `if` | умова запуску job чи кроку, наприклад `github.event_name == 'push'` |
| `steps` | кроки по черзі: `uses` — готова дія (action) з параметрами в `with`, `run` — команда shell |
| `env` | змінні середовища для кроку чи job |
| `${{ secrets.NAME }}` | секрет з налаштувань репозиторію; у логах маскується |

## Етапи

```text
push / pull request
   │
   ├─ test:   pytest проти справжньої PostgreSQL (service container)
   │
   ├─ build:  docker build → теги → push у ghcr.io      (лише main і теги версій)
   │
   └─ deploy: сервер бере новий образ, міграції, перезапуск   (з підтвердженням)
```

## Job 1: тести з PostgreSQL

GitHub Actions уміє піднімати контейнери поруч із job — **service containers**. Тести працюють з тією самою базою, що й production, а не з SQLite:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:18
        env:
          POSTGRES_USER: news
          POSTGRES_PASSWORD: news
          POSTGRES_DB: news_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-python@v7
        with:
          python-version: "3.13"
          cache: pip
      - run: pip install -r requirements.txt
      - run: python -m pytest
        env:
          DATABASE_URL: postgresql://news:news@localhost:5432/news_test
```

Кроки job виконуються прямо на машині-раннері, тому до бази звертаються через опублікований порт — `localhost:5432`. GitHub чекає, доки `--health-cmd` стане успішним, і лише тоді запускає кроки. Пароль тут не секрет: це одноразова тестова база, що зникне разом з job.

## Job 2: збирання й публікація образу

```yaml
  build:
    needs: test
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v7
      - uses: docker/login-action@v4
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - id: meta
        uses: docker/metadata-action@v6
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=ref,event=branch
            type=sha
      - uses: docker/setup-buildx-action@v4
      - uses: docker/build-push-action@v7
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

| Частина | Навіщо |
|---|---|
| `needs: test` | збирати лише після зелених тестів |
| `if: github.event_name == 'push'` | для pull request — лише тести, без публікації |
| `permissions: packages: write` | дозволити вбудованому `GITHUB_TOKEN` публікувати в `ghcr.io` |
| `docker/login-action` | увійти в реєстр; окремий токен не потрібен — `GITHUB_TOKEN` створюється для кожного запуску |
| `docker/metadata-action` | обчислити теги й мітки з git: версія з тегу, назва гілки, `sha-…` |
| `docker/setup-buildx-action` | збирач BuildKit; потрібен для кешу `type=gha` |
| `docker/build-push-action` | зібрати й опублікувати; `cache-from/to: type=gha` — кеш шарів між запусками |

Щоб випустити версію, створюють git-тег: `git tag v1.4.2 && git push origin v1.4.2` (щоб workflow реагував і на теги, у `on: push` додають `tags: ["v*"]`).

## Теги образу

| Тег | Змінюється? | Для чого |
|---|---|---|
| `sha-9f3c2a1` | ніколи | точно знати, який коміт працює; відкат |
| `1.4.2` | ніколи (за домовленістю) | реліз для людей і конфігів |
| `1.4`, `1` | з кожним патчем / мінорним релізом | «остання 1.4.x» |
| `main` | з кожним push у main | staging, ручні перевірки |
| `latest` | з кожним стабільним релізом | зручно вручну, **не** для конфігів сервера |

На сервері чи в конфігу платформи записують **незмінний** тег (`1.4.2` або `sha-…`): тоді відкат — це повернення попереднього значення, і ти точно знаєш, що працювало. Пре-реліз (`v2.0.0-rc.1`) отримує лише свій повний тег — інакше `latest` у когось підтягне незавершену версію.

> [!WARNING]
> Назва репозиторію образу в Docker — лише **малими літерами**. `ghcr.io/Gadget-Shop/API` Docker відхилить з помилкою `repository name must be lowercase`. Пам'ятай про це, коли складаєш назву сам(а) — у скрипті чи з `github.repository`, де в імені власника можуть бути великі літери.

## Job 3: деплой

```yaml
  deploy:
    needs: build
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: ./deploy.sh "${GITHUB_REF_NAME#v}"   # напр. 1.4.2: pull образу, migrate, up -d
```

`environment: production` прив'язує job до середовища в налаштуваннях репозиторію: там задають секрети саме цього середовища й **правила захисту**, наприклад обов'язкове схвалення людиною перед запуском. Що робить сам деплой, залежить від платформи: SSH на сервер з `docker compose pull && docker compose up -d`, команда хмарної платформи чи оновлення маніфесту Kubernetes. Про безпечний реліз — у наступному уроці.

## Підсумок

- Конвеєр: тести → збирання образу один раз → публікація → деплой того самого образу.
- Тести з PostgreSQL як service container; з кроків job до неї — `localhost` і опублікований порт.
- `ghcr.io` + `GITHUB_TOKEN` з `permissions: packages: write`; дії Docker: login, metadata, setup-buildx, build-push з кешем `gha`.
- Незмінні теги (`1.4.2`, `sha-…`) — для серверів і відкату; `latest` і `main` рухаються.
- Назви образів — малими літерами; деплой — з `environment` і схваленням.
