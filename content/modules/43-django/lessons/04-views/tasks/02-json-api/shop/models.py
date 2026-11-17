"""Моделі магазину (лише для читання)."""

from django.db import models


class Product(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"

    name = models.CharField(max_length=100)
    sku = models.CharField(max_length=20, unique=True)
    price = models.PositiveIntegerField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
