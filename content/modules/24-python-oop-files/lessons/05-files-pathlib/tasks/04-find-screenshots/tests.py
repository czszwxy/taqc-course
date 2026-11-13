from solution import failed_screenshots


def make_results(root):
    files = [
        "login-chromium/test-failed-1.png",
        "login-chromium/trace.zip",
        "cart-chromium/test-finished-1.png",
        "cart-chromium/test-failed-1.png",
        "failed-suite/screenshot.png",
        "summary.png",
    ]
    for name in files:
        path = root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(b"png")
    return root


def test_finds_failed_in_subfolders(tmp_path):
    """rglob шукає в усіх підпапках; шляхи відносно folder, відсортовані."""
    assert failed_screenshots(make_results(tmp_path)) == [
        "cart-chromium/test-failed-1.png",
        "login-chromium/test-failed-1.png",
    ]


def test_folder_name_does_not_count(tmp_path):
    """Перевіряй назву файлу (path.name), а не весь шлях: папка failed-suite не робить файл «упалим»."""
    assert "failed-suite/screenshot.png" not in failed_screenshots(make_results(tmp_path))


def test_empty_folder(tmp_path):
    assert failed_screenshots(tmp_path) == []
