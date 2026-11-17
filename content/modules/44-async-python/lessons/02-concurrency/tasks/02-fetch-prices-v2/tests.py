import pytest

from fakes import ProfileService
from solution import load_profiles


@pytest.mark.asyncio
async def test_all_found():
    """Усі знайдені — усі в profiles, failed порожній."""
    profiles, failed = await load_profiles(ProfileService(), [1, 2])
    assert list(profiles) == [1, 2]
    assert profiles[2]["email"] == "ivan@example.com"
    assert failed == []


@pytest.mark.asyncio
async def test_failures_are_collected():
    """Видалений (3) і зламаний (5) профілі — у failed, решта — у profiles; порядок як у user_ids."""
    profiles, failed = await load_profiles(ProfileService(), [5, 1, 3, 4])
    assert list(profiles) == [1, 4]
    assert failed == [5, 3]


@pytest.mark.asyncio
async def test_concurrent():
    """Запити йдуть одночасно: пік = кількість унікальних id."""
    service = ProfileService()
    await load_profiles(service, [1, 2, 3, 4, 5])
    assert service.peak == 5


@pytest.mark.asyncio
async def test_duplicates_once():
    """Повторений id — один запит."""
    service = ProfileService()
    profiles, failed = await load_profiles(service, [1, 1, 3, 3])
    assert (list(profiles), failed) == ([1], [3])
    assert sorted(service.calls) == [1, 3]


@pytest.mark.asyncio
async def test_empty():
    """Порожній список — ({}, [])."""
    assert await load_profiles(ProfileService(), []) == ({}, [])
