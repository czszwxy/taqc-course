from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render

from .models import Book


def book_list(request):
    return render(request, "library/book_list.html", {"books": Book.objects.all()})


def book_detail(request, pk):
    book = get_object_or_404(Book, pk=pk)
    return JsonResponse({"id": book.pk, "title": book.title, "author": book.author, "status": book.status})
