import pytest
import requests

TIMEOUT = 5


@pytest.fixture(scope="session")
def api(base_url):
    return f"{base_url}/api"


def test_health(api):
    response = requests.get(f"{api}/health", timeout=TIMEOUT)

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "1.4.0"}


# твій код тут: фільтр за категорією, сторінки без перетину, товар 999, вхід без пароля
