"""Форма товару (лише для читання)."""

from django import forms

from .models import Product


class ProductForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = ["name", "sku", "price"]

    def clean_sku(self):
        return self.cleaned_data["sku"].strip().upper()

    def clean_price(self):
        price = self.cleaned_data["price"]
        if price < 1:
            raise forms.ValidationError("Price must be at least 1.")
        return price
