from solution import slowest_tests

REPORT = """<testsuites>
  <testsuite name="shard-1">
    <testcase classname="tests.ui.test_login" name="test_valid_login" time="1.2" />
    <testcase classname="tests.ui.test_checkout" name="test_place_order" time="8.42" />
    <testcase classname="tests.api.test_orders" name="test_create" time="0.05" />
  </testsuite>
  <testsuite name="shard-2">
    <testcase classname="tests.ui.test_search" name="test_by_name" time="10.5" />
    <testcase classname="tests.ui.test_search" name="test_filters" time="9.1"><failure message="boom" /></testcase>
  </testsuite>
</testsuites>"""


def test_top_three():
    assert slowest_tests(REPORT, 3) == [
        ("tests.ui.test_search::test_by_name", 10.5),
        ("tests.ui.test_search::test_filters", 9.1),
        ("tests.ui.test_checkout::test_place_order", 8.42),
    ]


def test_time_is_a_number():
    """Атрибут time — рядок: як рядок "10.5" < "9.1". Перетвори на float."""
    assert slowest_tests(REPORT, 1) == [("tests.ui.test_search::test_by_name", 10.5)]


def test_limit_larger_than_report():
    assert len(slowest_tests(REPORT, 50)) == 5


def test_limit_zero():
    assert slowest_tests(REPORT, 0) == []


def test_tie_sorted_by_name():
    """Однаковий час — за назвою за абеткою."""
    text = """<testsuite>
      <testcase classname="tests.b" name="test_two" time="2.0" />
      <testcase classname="tests.a" name="test_one" time="2.0" />
    </testsuite>"""
    assert slowest_tests(text, 2) == [("tests.a::test_one", 2.0), ("tests.b::test_two", 2.0)]


def test_missing_time_is_zero():
    """Немає атрибута time — 0.0: case.get("time", "0")."""
    text = '<testsuite><testcase classname="tests.a" name="test_x" /></testsuite>'
    assert slowest_tests(text, 1) == [("tests.a::test_x", 0.0)]
