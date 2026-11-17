import re

from django import forms

from .models import Product

SKU_PATTERN = re.compile(r"[A-Z0-9-]{3,20}")
MIN_NAME_LENGTH = 2


class ProductForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = ["name", "sku", "price", "compare_at_price", "stock"]

    def clean_name(self):
        name = self.cleaned_data["name"].strip()
        if len(name) < MIN_NAME_LENGTH:
            raise forms.ValidationError("Name is too short.")
        return name

    def clean_sku(self):
        sku = self.cleaned_data["sku"].strip().upper()
        if not SKU_PATTERN.fullmatch(sku):
            raise forms.ValidationError("Use 3-20 letters, digits or dashes.")
        return sku

    def clean_price(self):
        price = self.cleaned_data["price"]
        if price < 1:
            raise forms.ValidationError("Price must be at least 1.")
        return price

    def clean(self):
        cleaned = super().clean()
        price = cleaned.get("price")
        old_price = cleaned.get("compare_at_price")
        if old_price is not None and price is not None and old_price <= price:
            self.add_error("compare_at_price", "Must be higher than the price.")
        return cleaned
