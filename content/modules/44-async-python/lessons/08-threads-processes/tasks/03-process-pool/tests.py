import hashlib

from solution import checksums, sha256_hex

BLOBS = [f"photo-{n}".encode() * (n + 1) for n in range(6)]


def test_sha256_hex():
    """sha256_hex — hashlib.sha256(...).hexdigest()."""
    assert sha256_hex(b"cat") == "77af778b51abd4a3c51c5ddd97204a9c3ae614ebccb75a606c3b6865aed6744e"


def test_checksums_in_order():
    """Суми для кожного елемента, у тому самому порядку."""
    assert checksums(BLOBS) == [hashlib.sha256(blob).hexdigest() for blob in BLOBS]


def test_workers_argument():
    """З іншою кількістю процесів результат той самий."""
    assert checksums(BLOBS, workers=3) == [hashlib.sha256(blob).hexdigest() for blob in BLOBS]


def test_empty():
    """Порожній список — []."""
    assert checksums([]) == []
