from django.db import models
from django.db.models import Q


class Product(models.Model):
    name = models.CharField(max_length=100)
    price = models.PositiveIntegerField()

    def __str__(self):
        return self.name


# твій код тут
