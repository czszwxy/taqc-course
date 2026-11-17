from django.db import models
from django.db.models import Q


class Category(models.Model):
    name = models.CharField(max_length=50)

    def __str__(self):
        return self.name


# твій код тут
