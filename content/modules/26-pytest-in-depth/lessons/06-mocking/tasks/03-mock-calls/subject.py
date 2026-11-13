def notify_failed(results, send):
    """Send one message per failed test; return how many messages were sent."""
    failed = [name for name, status in results if status == "failed"]
    for name in failed:
        send(f"FAILED: {name}")
    return len(failed)
