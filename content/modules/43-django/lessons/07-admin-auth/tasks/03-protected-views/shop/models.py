"""Модель замовлення (лише для читання)."""

from django.conf import settings
from django.db import models


class Order(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "New"
        PAID = "paid", "Paid"
        SHIPPED = "shipped", "Shipped"
        CANCELLED = "cancelled", "Cancelled"

    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders")
    number = models.CharField(max_length=12, unique=True)
    total = models.PositiveIntegerField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.NEW)
