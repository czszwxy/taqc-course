export type Bug = {
  id: number;
  status: string;
};

export type BugSummary = {
  total: number;
  open: number;
  closed: number;
};

export function summarizeBugs(bugs: Bug[]): BugSummary {
  let closed = 0;
  for (const bug of bugs) {
    if (bug.status === 'Closed') {
      closed++;
    }
  }
  return { total: bugs.length, open: bugs.length - closed, closed };
}
