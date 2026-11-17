import re

from rest_framework import generics, serializers
from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name", "sku", "price", "stock", "status", "created_at"]


class ProductListCreateView(generics.ListCreateAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer


# твій код тут
