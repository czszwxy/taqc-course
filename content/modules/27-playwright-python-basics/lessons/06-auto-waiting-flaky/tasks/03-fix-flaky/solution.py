from playwright.sync_api import Page, expect


def test_slow_request_shows_the_response(page: Page):
    page.goto("/playground/api")
    send = page.get_by_test_id("api-send")

    send.click()
    expect(page.get_by_test_id("api-status")).to_have_text("200 OK")

    page.get_by_label("URL").fill("/api/slow?ms=1500")
    send.click()

    expect(page.get_by_test_id("api-response-body")).to_contain_text('"waitedMs": 1500')
    expect(page.get_by_test_id("api-status")).to_have_text("200 OK")


def test_send_is_disabled_while_waiting(page: Page):
    page.goto("/playground/api")
    send = page.get_by_test_id("api-send")

    page.get_by_label("URL").fill("/api/slow?ms=1500")
    send.click()

    expect(send).to_be_disabled()
    expect(page.get_by_test_id("api-response-body")).to_contain_text('"waitedMs": 1500')
    expect(send).to_be_enabled()
