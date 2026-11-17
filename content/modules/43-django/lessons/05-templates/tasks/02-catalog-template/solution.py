{% extends "shop/base.html" %}

{% block title %}Catalog · {{ block.super }}{% endblock %}

{% block content %}
  <h1>Catalog</h1>
  <p class="count">{{ page_obj.paginator.count }} product{{ page_obj.paginator.count|pluralize }}</p>
  <ul class="products">
    {% for product in products %}
      <li>
        <a href="{% url 'product-detail' product.slug %}">{{ product.name }}</a> — {{ product.price }} UAH
        {% if product.stock == 0 %}<span class="badge">Out of stock</span>{% endif %}
      </li>
    {% empty %}
      <li>No products yet.</li>
    {% endfor %}
  </ul>
  {% if page_obj.has_next %}
    <a class="next" href="?page={{ page_obj.next_page_number }}">Next</a>
  {% endif %}
{% endblock %}
