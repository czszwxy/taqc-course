def print_summary(results):
    failed = results.count("failed")
    passed = len(results) - failed
    print(f"Total: {len(results)}")
    print(f"Passed: {passed}")
    if failed:
        print(f"Failed: {failed}")
