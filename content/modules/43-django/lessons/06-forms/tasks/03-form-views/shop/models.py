"""Модель товару (лише для читання)."""

from django.db import models


class Product(models.Model):
    name = models.CharField(max_length=100)
    sku = models.CharField(max_length=20, unique=True)
    price = models.PositiveIntegerField()
