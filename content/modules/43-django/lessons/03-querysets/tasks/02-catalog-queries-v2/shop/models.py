"""Моделі магазину (лише для читання)."""

from django.db import models


class Customer(models.Model):
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=60)

    def __str__(self):
        return self.email


class Order(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "New"
        PAID = "paid", "Paid"
        SHIPPED = "shipped", "Shipped"
        CANCELLED = "cancelled", "Cancelled"

    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="orders")
    number = models.CharField(max_length=12, unique=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.NEW)
    total = models.PositiveIntegerField()
    created_at = models.DateTimeField()

    def __str__(self):
        return f"Order {self.number}"
