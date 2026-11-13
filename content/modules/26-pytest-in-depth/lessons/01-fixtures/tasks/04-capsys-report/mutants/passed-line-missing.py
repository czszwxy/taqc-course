def print_summary(results):
    failed = results.count("failed")
    print(f"Total: {len(results)}")
    if failed:
        print(f"Failed: {failed}")
