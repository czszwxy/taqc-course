"""Your Python Playwright practice folder: add your own test_*.py files here.

Run from the project folder (the app must be running: launcher or npm run dev):
    npm run lab:py                          all tests in lab/python/tests
    npm run lab:py -- --headed              watch the browser
    npm run lab:py -- --headed --slowmo 500 slow motion
    npm run lab:py -- -k remember           only tests whose name contains "remember"
    npm run lab:py -- --tracing retain-on-failure   keep a trace of every failed test (lab/python/test-results)
    npm run lab:py-trace -- test-results/<folder>/trace.zip   open a trace in the Trace Viewer
    npm run lab:py-codegen -- http://localhost:5173/playground/login   record a test with Codegen
The pages here are the Bug Playground WITH its bugs, so a good test may fail: that means it found a bug!
"""

from playwright.sync_api import Page, expect


def test_show_password_reveals_the_password(page: Page):
    page.goto("/playground/login")
    password = page.get_by_label("Password", exact=True)

    password.fill("Demo1234")
    expect(password).to_have_attribute("type", "password")

    page.get_by_label("Show password").check()
    expect(password).to_have_attribute("type", "text")


def test_remember_me_is_off_by_default(page: Page):
    page.goto("/playground/login")

    expect(page.get_by_label("Remember me")).not_to_be_checked()
