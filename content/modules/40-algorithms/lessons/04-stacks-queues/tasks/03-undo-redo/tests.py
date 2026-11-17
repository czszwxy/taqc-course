import pytest

from solution import Editor


def test_write_and_delete():
    editor = Editor()
    editor.write("Great ")
    editor.write("product")
    editor.delete(7)
    assert editor.text == "Great "


def test_delete_more_than_the_text():
    editor = Editor()
    editor.write("ok")
    editor.delete(10)
    assert editor.text == ""


def test_delete_needs_a_positive_count():
    with pytest.raises(ValueError, match="count must be positive"):
        Editor().delete(0)


def test_undo_steps_back_one_change_at_a_time():
    """Стек undo: остання зміна скасовується першою."""
    editor = Editor()
    editor.write("a")
    editor.write("b")
    editor.write("c")
    assert editor.undo() is True
    assert editor.text == "ab"
    assert editor.undo() is True
    assert editor.text == "a"


def test_undo_with_nothing_to_undo():
    editor = Editor()
    assert editor.undo() is False
    assert editor.text == ""


def test_redo_after_undo():
    """Скасований стан переходить на стек redo."""
    editor = Editor()
    editor.write("Great ")
    editor.write("product")
    editor.undo()
    assert editor.redo() is True
    assert editor.text == "Great product"
    assert editor.redo() is False


def test_new_change_clears_redo():
    """Після нової зміни redo порожній."""
    editor = Editor()
    editor.write("one")
    editor.undo()
    editor.write("two")
    assert editor.redo() is False
    assert editor.text == "two"


def test_undo_a_delete():
    editor = Editor()
    editor.write("Great product")
    editor.delete(7)
    editor.undo()
    assert editor.text == "Great product"
