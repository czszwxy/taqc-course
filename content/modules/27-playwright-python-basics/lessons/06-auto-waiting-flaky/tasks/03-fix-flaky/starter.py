import time

from playwright.sync_api import Page, expect


def test_slow_request_shows_the_response(page: Page):
    page.goto("/playground/api")
    send = page.get_by_test_id("api-send")

    # 1. Швидкий запит GET /api/health (адреса вже заповнена)
    send.click()
    expect(page.get_by_test_id("api-status")).to_have_text("200 OK")

    # 2. Повільний запит: сервер відповідає через 1,5 секунди
    page.get_by_label("URL").fill("/api/slow?ms=1500")
    send.click()

    time.sleep(0.5)  # "на моєму комп'ютері вистачало"
    assert "200" in page.get_by_test_id("api-status").inner_text()
    assert '"waitedMs": 1500' in page.get_by_test_id("api-response-body").inner_text()


# твій код тут: test_send_is_disabled_while_waiting
