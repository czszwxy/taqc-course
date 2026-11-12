def failed_names(results: list[dict]) -> list[str]:
    return [r["name"] for r in results if r["status"] == "failed"]
