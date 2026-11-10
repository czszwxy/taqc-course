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
  // твій код тут
}
