"""Моделі магазину (лише для читання)."""

from django.db import models


class Customer(models.Model):
    name = models.CharField(max_length=60)


class Product(models.Model):
    name = models.CharField(max_length=100)


class Order(models.Model):
    number = models.CharField(max_length=12, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="orders")


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="order_items")
    quantity = models.PositiveSmallIntegerField(default=1)
