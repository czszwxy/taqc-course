import re

from rest_framework import generics, serializers
from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import Product

SKU_PATTERN = re.compile(r"[A-Z0-9-]{3,20}")


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name", "sku", "price", "stock", "status", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_sku(self, value):
        sku = value.strip().upper()
        if not SKU_PATTERN.fullmatch(sku):
            raise serializers.ValidationError("Use 3-20 letters, digits or dashes.")
        duplicates = Product.objects.filter(sku=sku)
        if self.instance is not None:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError("Product with this SKU already exists.")
        return sku

    def validate_price(self, value):
        if value < 1:
            raise serializers.ValidationError("Price must be at least 1.")
        return value


class IsStaffOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or request.user.is_staff


class ProductListCreateView(generics.ListCreateAPIView):
    serializer_class = ProductSerializer
    permission_classes = [IsStaffOrReadOnly]

    def get_queryset(self):
        products = Product.objects.order_by("name")
        status = self.request.query_params.get("status")
        return products.filter(status=status) if status else products


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsStaffOrReadOnly]
