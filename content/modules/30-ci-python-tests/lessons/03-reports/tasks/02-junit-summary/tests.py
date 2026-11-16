from solution import summarize_junit

REPORT = """<?xml version="1.0" encoding="utf-8"?>
<testsuites name="pytest tests">
  <testsuite name="pytest" errors="1" failures="1" skipped="1" tests="5" time="3.214">
    <testcase classname="tests.ui.test_login" name="test_valid_login" time="1.204" />
    <testcase classname="tests.ui.test_login" name="test_wrong_password" time="0.982">
      <failure message="AssertionError: Locator expected to have text 'Invalid email or password'">traceback</failure>
    </testcase>
    <testcase classname="tests.api.test_orders" name="test_create_order" time="0.051" />
    <testcase classname="tests.api.test_orders" name="test_delete_twice" time="0.000">
      <error message="failed on setup with &quot;KeyError: 'token'&quot;">traceback</error>
    </testcase>
    <testcase classname="tests.ui.test_cart" name="test_promo" time="0.000">
      <skipped type="pytest.skip" message="promo codes are not on staging yet">reason</skipped>
    </testcase>
  </testsuite>
</testsuites>"""

MERGED = """<testsuites>
  <testsuite name="shard-1" tests="2">
    <testcase classname="tests.ui.test_search" name="test_by_name" time="2.1" />
    <testcase classname="tests.ui.test_search" name="test_empty" time="1.4"><failure message="boom" /></testcase>
  </testsuite>
  <testsuite name="shard-2" tests="2">
    <testcase classname="tests.api.test_products" name="test_list" time="0.2" />
    <testcase classname="tests.api.test_products" name="test_missing" time="0.1"><failure message="boom" /></testcase>
  </testsuite>
</testsuites>"""


def test_summary_of_a_run():
    assert summarize_junit(REPORT) == {
        "total": 5,
        "passed": 2,
        "failed": 1,
        "errors": 1,
        "skipped": 1,
        "failed_tests": ["tests.ui.test_login::test_wrong_password", "tests.api.test_orders::test_delete_twice"],
    }


def test_error_is_not_a_failure():
    """<error> (упала фікстура) рахується в errors, а не в failed — але назва потрапляє у failed_tests."""
    summary = summarize_junit(REPORT)
    assert (summary["failed"], summary["errors"]) == (1, 1)
    assert "tests.api.test_orders::test_delete_twice" in summary["failed_tests"]


def test_empty_failure_element_counts():
    """<failure message="boom" /> без дітей — теж падіння. Перевіряй find(...) is not None, а не if find(...)."""
    summary = summarize_junit(MERGED)
    assert summary["failed"] == 2


def test_merged_report_of_two_shards():
    """Кілька <testsuite> у файлі: root.iter("testcase") знаходить тести в усіх."""
    assert summarize_junit(MERGED) == {
        "total": 4,
        "passed": 2,
        "failed": 2,
        "errors": 0,
        "skipped": 0,
        "failed_tests": ["tests.ui.test_search::test_empty", "tests.api.test_products::test_missing"],
    }


def test_single_testsuite_root():
    """Деякі інструменти пишуть <testsuite> без обгортки <testsuites>."""
    text = '<testsuite tests="1"><testcase classname="tests.test_a" name="test_ok" time="0.1" /></testsuite>'
    assert summarize_junit(text)["passed"] == 1


def test_empty_suite():
    assert summarize_junit('<testsuites><testsuite name="pytest" tests="0" /></testsuites>') == {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "errors": 0,
        "skipped": 0,
        "failed_tests": [],
    }
