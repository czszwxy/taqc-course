import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

FLUSH_EVERY_SECONDS = 5.0
ACCEPTED = 202
NOT_READY = 503


def create_app(database, flush_every=FLUSH_EVERY_SECONDS):
    async def flush(app):
        if app.state.pending:
            batch = list(app.state.pending)
            app.state.pending.clear()
            await database.save_events(batch)

    async def flush_forever(app):
        while True:
            await asyncio.sleep(flush_every)
            await flush(app)

    @asynccontextmanager
    async def lifespan(app):
        await database.connect()
        app.state.pending = []
        app.state.flusher = asyncio.create_task(flush_forever(app))
        yield
        app.state.flusher.cancel()
        await asyncio.gather(app.state.flusher, return_exceptions=True)
        await flush(app)
        await database.close()

    app = FastAPI(title="Gadget shop events", lifespan=lifespan)

    @app.post("/events", status_code=ACCEPTED)
    async def add_event(event: dict, request: Request):
        request.app.state.pending.append(event)
        return {"queued": len(request.app.state.pending)}

    @app.get("/ready")
    async def ready():
        if database.connected:
            return {"status": "ready"}
        return JSONResponse(status_code=NOT_READY, content={"status": "not ready"})

    return app
