import asyncio
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.responses import JSONResponse

from checks import CHECKS

app = FastAPI(title="Gadget shop API")

CHECK_TIMEOUT_SECONDS = 1.0
NOT_READY = 503


def get_checks():
    return CHECKS


def get_check_timeout():
    return CHECK_TIMEOUT_SECONDS


@app.get("/health")
def health():
    return {"status": "ok"}


async def run_check(check, timeout):
    try:
        async with asyncio.timeout(timeout):
            await check()
    except TimeoutError:
        return "timeout"
    except Exception:
        return "fail"
    return "ok"


@app.get("/ready")
async def ready(
    checks: Annotated[dict, Depends(get_checks)],
    timeout: Annotated[float, Depends(get_check_timeout)],
):
    names = list(checks)
    results = await asyncio.gather(*(run_check(checks[name], timeout) for name in names))
    statuses = dict(zip(names, results))
    if all(status == "ok" for status in statuses.values()):
        return {"status": "ready", "checks": statuses}
    return JSONResponse(status_code=NOT_READY, content={"status": "not ready", "checks": statuses})
