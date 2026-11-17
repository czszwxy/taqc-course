import sqlite3

import pytest

from solution import create_blog_schema


@pytest.fixture
def conn():
    conn = sqlite3.connect(":memory:")
    create_blog_schema(conn)
    conn.execute("INSERT INTO authors (id, email, name) VALUES (1, 'olha@blog.ua', 'Olha')")
    conn.execute("INSERT INTO posts (id, author_id, title) VALUES (10, 1, 'Hello')")
    conn.execute("INSERT INTO tags (id, name) VALUES (5, 'python')")
    conn.execute("INSERT INTO post_tags (post_id, tag_id) VALUES (10, 5)")
    yield conn
    conn.close()


def rejects(conn, sql):
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(sql)


def count(conn, table):
    return conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]


def test_default_status_is_draft(conn):
    assert conn.execute("SELECT status FROM posts WHERE id = 10").fetchone() == ("draft",)


def test_author_email_unique_and_name_required(conn):
    rejects(conn, "INSERT INTO authors (email, name) VALUES ('olha@blog.ua', 'Copy')")
    rejects(conn, "INSERT INTO authors (email) VALUES ('ivan@blog.ua')")


def test_post_needs_existing_author(conn):
    """Без `PRAGMA foreign_keys = ON` SQLite прийме пост неіснуючого автора."""
    rejects(conn, "INSERT INTO posts (author_id, title) VALUES (999, 'Ghost')")


def test_post_title_and_status_rules(conn):
    rejects(conn, "INSERT INTO posts (author_id) VALUES (1)")
    rejects(conn, "INSERT INTO posts (author_id, title, status) VALUES (1, 'Hi', 'archived')")
    conn.execute("INSERT INTO posts (author_id, title, status) VALUES (1, 'Hi', 'published')")


def test_tag_name_unique(conn):
    rejects(conn, "INSERT INTO tags (name) VALUES ('python')")


def test_same_tag_twice_on_a_post(conn):
    """Складений первинний ключ (post_id, tag_id)."""
    rejects(conn, "INSERT INTO post_tags (post_id, tag_id) VALUES (10, 5)")
    rejects(conn, "INSERT INTO post_tags (post_id, tag_id) VALUES (10, 77)")


def test_deleting_author_removes_posts_and_links(conn):
    conn.execute("DELETE FROM authors WHERE id = 1")
    assert (count(conn, "posts"), count(conn, "post_tags"), count(conn, "tags")) == (0, 0, 1)


def test_deleting_tag_removes_links(conn):
    conn.execute("DELETE FROM tags WHERE id = 5")
    assert (count(conn, "post_tags"), count(conn, "posts")) == (0, 1)
