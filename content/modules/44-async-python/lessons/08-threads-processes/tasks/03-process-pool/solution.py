import hashlib
from concurrent.futures import ProcessPoolExecutor


def sha256_hex(data):
    return hashlib.sha256(data).hexdigest()


def checksums(blobs, workers=2):
    if not blobs:
        return []
    with ProcessPoolExecutor(max_workers=workers) as pool:
        return list(pool.map(sha256_hex, blobs))
