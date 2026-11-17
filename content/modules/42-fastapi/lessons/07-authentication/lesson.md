# Автентифікація токенами

Майже кожен API має закриті частини: «мої замовлення», адмінку, зміну пароля. Сервер має відповісти на два різні питання:

- **Автентифікація** — *хто ти?* Немає облікових даних або вони невалідні → `401 Unauthorized`.
- **Авторизація** — *що тобі можна?* Користувач відомий, але прав немає → `403 Forbidden`.

Разом з `401` сервер надсилає заголовок `WWW-Authenticate: Bearer` — так клієнт знає, яким способом треба увійти.

## Паролі: ніколи не зберігай самі паролі

Якщо базу вкрадуть, паролі в чистому вигляді — катастрофа: люди використовують їх і на інших сайтах. Тому зберігають **хеш**:

```python
import hashlib, hmac, secrets

ITERATIONS = 200_000

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)                                   # своя «сіль» для кожного пароля
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), ITERATIONS)
    return f"{salt}${digest.hex()}"

def verify_password(password: str, stored: str) -> bool:
    salt, expected = stored.split("$")
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), ITERATIONS)
    return hmac.compare_digest(digest.hex(), expected)
```

- **Сіль** робить однакові паролі різними хешами — готові таблиці хешів не допоможуть.
- **Повільний** алгоритм (багато ітерацій) робить перебір дорогим. У проєктах беруть argon2 або bcrypt через бібліотеку (наприклад, `pwdlib`); `pbkdf2_hmac` зі стандартної бібліотеки — теж допустимий варіант.
- `hmac.compare_digest` порівнює за однаковий час — за часом відповіді не вгадаєш, скільки символів збіглося.

## Токен: «перепустка» замість пароля

Пароль надсилають **один раз** — при вході. Сервер відповідає **токеном**, і далі клієнт додає його до кожного запиту:

```text
POST /token   username=olga&password=...      →  {"access_token": "eyJhbGciOi...", "token_type": "bearer"}
GET  /tickets  Authorization: Bearer eyJhbGciOi...   →  200
```

Два поширені види токенів:

| | Непрозорий (`secrets.token_urlsafe(32)`) | JWT |
|---|---|---|
| Що всередині | випадковий рядок | дані (claims) + підпис |
| Як перевірити | знайти в базі / Redis | перевірити підпис секретним ключем — база не потрібна |
| Відкликати | видалити з бази | складніше: діє до `exp` |

## JWT зсередини

JWT — це три частини через крапку: `header.payload.signature`. Payload — це JSON, закодований base64: його **може прочитати будь-хто** (спробуй на jwt.io). Зате **підробити** не може ніхто без секретного ключа: зміниш хоч символ — підпис не зійдеться.

```python
from datetime import datetime, timedelta, timezone
import jwt   # пакет PyJWT

SECRET_KEY = "change-me-in-production-a-long-random-secret"   # у справжньому проєкті — зі змінної середовища
ALGORITHM = "HS256"

def create_token(username: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=30)
    return jwt.encode({"sub": username, "exp": expires}, SECRET_KEY, algorithm=ALGORITHM)

def read_token(token: str) -> str:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])   # перевіряє підпис і exp
    return payload["sub"]
```

- `sub` (subject) — кому видано токен, `exp` — до коли він дійсний.
- `jwt.decode` піднімає `jwt.ExpiredSignatureError` для простроченого токена і `jwt.InvalidTokenError` (його батьківський клас) для будь-якого невалідного.
- `algorithms=[...]` — обов'язково списком і явно: так сервер не прийме токен, «підписаний» іншим алгоритмом.
- Ключ HS256 — щонайменше 32 байти; коротший PyJWT позначить попередженням.

> [!WARNING]
> Не клади в JWT нічого секретного (пароль, номер картки): payload читається без ключа. І ніколи не вставляй робочі токени у сторонні сайти — це те саме, що віддати перепустку.

## FastAPI: вхід і поточний користувач

```python
from typing import Annotated
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

app = FastAPI()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)

@app.post("/token")
def login(form: Annotated[OAuth2PasswordRequestForm, Depends()]):
    agent = AGENTS.get(form.username)
    if agent is None or not verify_password(form.password, agent["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password",
                            headers={"WWW-Authenticate": "Bearer"})
    return {"access_token": create_token(agent["username"]), "token_type": "bearer"}

def get_current_agent(token: Annotated[str, Depends(oauth2_scheme)]) -> dict:
    try:
        username = read_token(token)
    except jwt.InvalidTokenError:
        raise CREDENTIALS_ERROR
    agent = AGENTS.get(username)
    if agent is None:              # токен справжній, але користувача вже видалили
        raise CREDENTIALS_ERROR
    return agent

CurrentAgent = Annotated[dict, Depends(get_current_agent)]

@app.get("/tickets/mine")
def my_tickets(agent: CurrentAgent):
    return [t for t in TICKETS if t["assignee"] == agent["username"]]
```

- `OAuth2PasswordRequestForm` читає **форму** (`username`, `password`), а не JSON — так вимагає стандарт OAuth2 (потрібен пакет `python-multipart`, він уже в лабораторії). У тесті: `client.post("/token", data={"username": ..., "password": ...})`.
- `OAuth2PasswordBearer` — залежність, що дістає токен із заголовка `Authorization: Bearer ...`. Немає заголовка — вона сама відповідає `401`. А ще в Swagger UI з'являється кнопка **Authorize**.
- Однакове повідомлення для «немає користувача» і «неправильний пароль» — щоб не підказувати, які логіни існують.

## Ролі: 403

```python
def require_supervisor(agent: CurrentAgent) -> dict:
    if agent["role"] != "supervisor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Supervisors only")
    return agent

@app.get("/reports", dependencies=[Depends(require_supervisor)])
def reports(): ...
```

Ланцюжок залежностей: `require_supervisor` → `get_current_agent` → `oauth2_scheme`. Без токена — `401` (не знаємо, хто ти), з токеном звичайного агента — `403` (знаємо, але не можна).

> [!NOTE]
> Без OAuth2 можна обійтися й простішим `HTTPBearer()` з `fastapi.security`: він теж читає `Authorization: Bearer ...` і відповідає `401` без токена, але повертає об'єкт з полями `scheme` і `credentials`.

## Типові помилки

| Помилка | Наслідок |
|---|---|
| `403` замість `401` для відсутнього токена | клієнт не розуміє, що треба увійти |
| Пароль у відкритому вигляді або хеш без солі | витік бази = витік паролів |
| `jwt.decode(token, key)` без `algorithms` | PyJWT відмовиться декодувати (і правильно зробить) |
| Секрет у коді й у git | будь-хто з доступом до репозиторію підробить токени |
| Не ловиш `InvalidTokenError` | прострочений токен дає `500` замість `401` |
| Різні повідомлення «немає логіна» / «неправильний пароль» | атакувальник дізнається, які логіни існують |

> [!QA]
> Безпека перевіряється негативними тестами: без токена, з простроченим, з підписаним іншим ключем, з `sub` неіснуючого користувача, зі схемою `Basic` замість `Bearer`, звичайний користувач на адмінському ендпоінті. Кожен має дати `401` або `403` — і жоден не повинен дати `500`.

## Підсумок

- `401` — хто ти? (з `WWW-Authenticate: Bearer`); `403` — тобі не можна.
- Паролі — лише як солений повільний хеш; порівняння — `hmac.compare_digest`.
- JWT: `sub` + `exp`, підпис секретним ключем; `jwt.decode(..., algorithms=[...])` перевіряє підпис і термін.
- `OAuth2PasswordRequestForm` — форма входу, `OAuth2PasswordBearer` — токен із заголовка.
- `get_current_user` — залежність, яку отримують усі закриті ендпоінти; ролі — ще одна залежність поверх неї.
