# Асинхронні ендпоінти у FastAPI

У модулі про FastAPI ти писав(ла) ендпоінти через звичайний `def`. FastAPI вміє і `async def` — і тут легко зробити як краще, а вийде гірше. Приклад — сервіс новин, що збирає статтю, коментарі й рекомендації.

## def чи async def

| Ендпоінт | Де виконується | Коли обирати |
|---|---|---|
| `async def` | прямо в **циклі подій** | усі очікування асинхронні: `await httpx…`, асинхронний драйвер бази |
| `def` | у **пулі потоків** (40 потоків за замовчуванням) | усередині синхронні бібліотеки: `requests`, синхронна сесія SQLAlchemy |

Небезпечна комбінація — **блокувальний виклик в `async def`**:

```python
@app.get("/articles/{article_id}")
async def article(article_id: int):
    return legacy_cms.load(article_id)        # ❌ синхронний виклик на 300 мс
```

Поки виконується `legacy_cms.load`, цикл подій стоїть — і **всі** інші запити до сервера, навіть `/health`, чекають. Під навантаженням сервер «замерзає».

Рішення:

```python
@app.get("/articles/{article_id}")
async def article(article_id: int):
    return await asyncio.to_thread(legacy_cms.load, article_id)    # ✅ у потоці, цикл вільний

@app.get("/articles/{article_id}")
def article(article_id: int):                                       # ✅ або звичайний def
    return legacy_cms.load(article_id)
```

## Конкурентність усередині ендпоінта

```python
@app.get("/articles/{article_id}/page")
async def article_page(article_id: int, services: Annotated[Services, Depends(get_services)]):
    async with asyncio.TaskGroup() as tg:
        article = tg.create_task(services.articles.get(article_id))
        comments = tg.create_task(services.comments.list(article_id))
    return {"article": article.result(), "comments": comments.result()}
```

Три незалежні виклики по 100 мс — це 100 мс, а не 300. Помилки обробляють як завжди: доменний виняток → `HTTPException` або обробник винятків.

## Асинхронні залежності й спільний клієнт

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http = httpx.AsyncClient(base_url="https://partner.test", timeout=3)
    yield
    await app.state.http.aclose()             # закрити з'єднання при зупинці

async def get_http(request: Request) -> httpx.AsyncClient:
    return request.app.state.http
```

Залежності бувають `async def` (зокрема з `yield`) — FastAPI сам їх дочекається. Один клієнт на весь застосунок перевикористовує з'єднання.

## Тести асинхронних ендпоінтів

`TestClient` з модуля про FastAPI працює і з `async def` — тести лишаються звичайними функціями. Коли тест сам має щось робити асинхронно (кілька запитів одночасно, асинхронні фікстури), беруть `httpx.AsyncClient` з `ASGITransport`:

```python
@pytest.mark.asyncio
async def test_page():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/articles/1/page")
    assert response.status_code == 200
```

> [!NOTE]
> `ASGITransport` не запускає `lifespan`. Якщо застосунок створює ресурси там, у тестах їх підставляють через `app.dependency_overrides` (як у модулі про FastAPI) або запускають застосунок через `TestClient` у `with`.

## Типові помилки

| Помилка | Наслідок |
|---|---|
| `requests` / `time.sleep` / синхронна база в `async def` | сервер не відповідає нікому, поки йде цей виклик |
| «Все зроблю async def — так швидше» | швидше лише з асинхронними бібліотеками |
| Новий `AsyncClient` на кожен запит | немає перевикористання з'єднань |
| Послідовні `await` незалежних викликів | сторінка в N разів повільніша |
| Важкі обчислення в ендпоінті | блокують і `def`-пул, і цикл; виносять у фонові воркери |

> [!QA]
> «Сервер замерзає під навантаженням» — класичний баг асинхронних сервісів. Його ловить тест, що запускає повільний запит і **одночасно** легкий (`/health`): легкий має відповісти першим. Якщо він чекає на повільний — десь блокувальний виклик у `async def`.

## Підсумок

- `async def` — у циклі подій, лише з асинхронними викликами; `def` — у пулі потоків.
- Блокувальний виклик в `async def` зупиняє весь сервер; рішення — `asyncio.to_thread` або `def`.
- Незалежні виклики в ендпоінті — `gather` / `TaskGroup`.
- Асинхронні залежності й спільний `AsyncClient` у `lifespan`.
- Тести: `TestClient` або `httpx.AsyncClient(transport=ASGITransport(app=app))` з `@pytest.mark.asyncio`.
