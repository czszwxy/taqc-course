def notify_failed(results, send):
    """Send one message per failed test; return how many messages were sent."""
    failed = [name for name, status in results if status == "failed"]
    if failed:
        send("FAILED: " + ", ".join(failed))
    return len(failed)
