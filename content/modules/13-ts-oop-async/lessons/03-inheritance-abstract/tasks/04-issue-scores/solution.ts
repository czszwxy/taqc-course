export abstract class Issue {
  constructor(readonly title: string) {}

  abstract score(): number;
}

export type Severity = 'Critical' | 'Major' | 'Minor';

const SEVERITY_SCORE: Record<Severity, number> = { Critical: 30, Major: 20, Minor: 10 };

export class Bug extends Issue {
  constructor(
    title: string,
    readonly severity: Severity,
  ) {
    super(title);
  }

  score(): number {
    return SEVERITY_SCORE[this.severity];
  }
}

export class Story extends Issue {
  constructor(
    title: string,
    readonly points: number,
  ) {
    super(title);
  }

  score(): number {
    return this.points;
  }
}

export function topIssue(issues: Issue[]): string | null {
  if (issues.length === 0) return null;
  const best = issues.reduce((top, issue) => (issue.score() > top.score() ? issue : top));
  return best.title;
}
