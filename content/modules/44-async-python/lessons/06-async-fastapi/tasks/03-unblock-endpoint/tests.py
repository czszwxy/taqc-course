import asyncio

import httpx
import pytest

from solution import app


def client():
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


@pytest.mark.asyncio
async def test_report_content():
    """Звіт — той самий JSON, що повертає build_report."""
    async with client() as http:
        response = await http.get("/reports/2026-05-01")
    assert response.json() == {"day": "2026-05-01", "orders": 42, "revenue": 128_500}


@pytest.mark.asyncio
async def test_health_answers_during_report():
    """Поки будується звіт, /health відповідає першим — цикл подій не заблоковано."""
    finished = []

    async def get(http, path, delay):
        await asyncio.sleep(delay)
        response = await http.get(path)
        finished.append(path)
        return response

    async with client() as http:
        await asyncio.gather(get(http, "/reports/2026-05-01", 0), get(http, "/health", 0.05))
    assert finished == ["/health", "/reports/2026-05-01"]


@pytest.mark.asyncio
async def test_health():
    """/health — {"status": "ok"}."""
    async with client() as http:
        assert (await http.get("/health")).json() == {"status": "ok"}
