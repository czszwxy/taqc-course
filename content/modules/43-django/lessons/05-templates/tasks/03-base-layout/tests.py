from datetime import datetime

import pytest
from django.utils import timezone
from pytest_django.asserts import assertContains, assertNotContains

pytestmark = pytest.mark.django_db


def test_default_title(client):
    """Сторінка без свого заголовка — <title>Gadget shop</title> (блок title за замовчуванням)."""
    assertContains(client.get("/"), "<title>Gadget shop</title>", html=True)


def test_child_title(client):
    """cart.html перевизначає блок title — <title>Your cart</title>."""
    assertContains(client.get("/cart/"), "<title>Your cart</title>", html=True)


def test_content_block(client):
    """Вміст дочірньої сторінки потрапляє в <main> (блок content)."""
    assertContains(client.get("/"), "<main><h1>Welcome to Gadget shop</h1></main>", html=True)
    assertContains(client.get("/cart/"), "<main><h1>Your cart is empty</h1></main>", html=True)


def test_nav_links(client):
    """У <nav> — Catalog і Cart з адресами з {% url %}."""
    response = client.get("/cart/")
    assertContains(response, '<a href="/">Catalog</a>', html=True)
    assertContains(response, '<a href="/cart/">Cart</a>', html=True)


def test_guest_sees_log_in(client):
    """Гість: посилання Log in, без Log out і без привітання."""
    response = client.get("/")
    assertContains(response, '<a href="/accounts/login/">Log in</a>', html=True)
    assertNotContains(response, "Log out")
    assertNotContains(response, "Hi,")


def test_user_sees_name_and_log_out(client, django_user_model):
    """Увійшлий користувач: <span class="user">Hi, anna</span> і Log out, без Log in."""
    client.force_login(django_user_model.objects.create_user("anna", password="pw-123456"))
    response = client.get("/")
    assertContains(response, '<span class="user">Hi, anna</span>', html=True)
    assertContains(response, '<a href="/accounts/logout/">Log out</a>', html=True)
    assertNotContains(response, "Log in")


def test_username_is_escaped(client, django_user_model):
    """Ім'я користувача екранується."""
    client.force_login(django_user_model.objects.create_user("<b>evil</b>", password="pw-123456"))
    assertContains(client.get("/"), "Hi, &lt;b&gt;evil&lt;/b&gt;")


def test_footer_year(client):
    """<footer>© поточний рік Gadget shop</footer> — рік з {% now "Y" %}."""
    year = timezone.localtime().year
    assertContains(client.get("/"), f"<footer>&copy; {year} Gadget shop</footer>", html=True)


def test_full_document(client):
    """Повний документ: doctype, <html lang="en">, meta charset."""
    body = client.get("/").content.decode().lower()
    assert body.lstrip().startswith("<!doctype html>")
    assert '<html lang="en">' in body
    assert '<meta charset="utf-8">' in body
