from solution import Product, import_products

ROWS = [
    {"sku": " mouse-01 ", "name": " Wireless mouse ", "price": "899"},
    {"sku": "KB-02", "name": "Keyboard", "price": "1599"},
]


def test_valid_rows():
    """SKU — без пробілів і великими літерами, назва — без пробілів по краях."""
    products, errors = import_products(ROWS)
    assert products == [Product("MOUSE-01", "Wireless mouse", 899), Product("KB-02", "Keyboard", 1599)]
    assert errors == []


def test_line_numbers_start_after_header():
    """rows[0] — це рядок 2 файлу (рядок 1 — заголовок)."""
    rows = [{"sku": "A-1", "name": "A", "price": "10"}, {"sku": "B-1", "name": "", "price": "10"}]
    assert import_products(rows)[1] == ["line 3: invalid row"]


def test_duplicate_in_file_ignores_case():
    """mouse-01 і MOUSE-01 — той самий товар."""
    rows = [{"sku": "mouse-01", "name": "Mouse", "price": "899"}, {"sku": "MOUSE-01 ", "name": "Mouse again", "price": "899"}]
    products, errors = import_products(rows)
    assert products == [Product("MOUSE-01", "Mouse", 899)]
    assert errors == ["line 3: duplicate SKU MOUSE-01"]


def test_known_skus_are_duplicates():
    products, errors = import_products(ROWS, known_skus={"KB-02"})
    assert [p.sku for p in products] == ["MOUSE-01"]
    assert errors == ["line 3: duplicate SKU KB-02"]


def test_calls_are_independent():
    """Другий імпорт того самого файлу не бачить «дублікатів» з першого: змінюваний default ділиться між викликами."""
    import_products(ROWS)
    products, errors = import_products(ROWS)
    assert len(products) == 2
    assert errors == []


def test_known_skus_not_changed():
    """Функція не змінює переданий set — працюй з копією."""
    known = {"CAM-01"}
    import_products(ROWS, known_skus=known)
    assert known == {"CAM-01"}


def test_invalid_rows():
    rows = [
        {"sku": "", "name": "No sku", "price": "10"},
        {"sku": "P-1", "name": "Zero", "price": "0"},
        {"sku": "P-2", "name": "Text price", "price": "abc"},
        {"sku": "P-3", "name": "Decimal", "price": "9.99"},
        {"sku": "P-4", "name": "No price"},
    ]
    products, errors = import_products(rows)
    assert products == []
    assert errors == [f"line {n}: invalid row" for n in range(2, 7)]


def test_empty():
    assert import_products([]) == ([], [])
