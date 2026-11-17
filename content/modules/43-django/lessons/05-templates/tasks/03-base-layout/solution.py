<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>{% block title %}Gadget shop{% endblock %}</title>
</head>
<body>
  <nav>
    <a href="{% url 'home' %}">Catalog</a>
    <a href="{% url 'cart' %}">Cart</a>
    {% if user.is_authenticated %}
      <span class="user">Hi, {{ user.username }}</span>
      <a href="{% url 'logout' %}">Log out</a>
    {% else %}
      <a href="{% url 'login' %}">Log in</a>
    {% endif %}
  </nav>
  <main>{% block content %}{% endblock %}</main>
  <footer>&copy; {% now "Y" %} Gadget shop</footer>
</body>
</html>
