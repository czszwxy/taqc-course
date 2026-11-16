def find_flaky(runs: list[dict]) -> list[str]:
    outcomes_by_run = {}
    for run in runs:
        key = (run["test"], run["commit"])
        outcomes_by_run.setdefault(key, set()).add(run["outcome"])

    flaky = set()
    for (test, _commit), outcomes in outcomes_by_run.items():
        if {"passed", "failed"} <= outcomes:
            flaky.add(test)
    return sorted(flaky)
