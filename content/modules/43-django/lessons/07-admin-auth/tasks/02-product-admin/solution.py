from django.contrib import admin

from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug"]
    prepopulated_fields = {"slug": ["name"]}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "sku", "category", "price", "stock", "status"]
    list_filter = ["status", "category"]
    search_fields = ["name", "sku"]
    prepopulated_fields = {"slug": ["name"]}
    readonly_fields = ["created_at"]
    ordering = ["name"]
    actions = ["archive"]

    @admin.action(description="Archive selected products")
    def archive(self, request, queryset):
        updated = queryset.update(status=Product.Status.ARCHIVED)
        self.message_user(request, f"{updated} products archived.")
