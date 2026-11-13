def print_summary(results):
    passed = results.count("passed")
    failed = results.count("failed")
    print(f"Total: {len(results)}")
    print(f"Passed: {passed}")
    if failed:
        print(f"Failed: {failed}")
