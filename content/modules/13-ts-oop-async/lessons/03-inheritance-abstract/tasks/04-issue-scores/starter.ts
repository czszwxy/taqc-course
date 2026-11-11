export abstract class Issue {
  constructor(readonly title: string) {}

  abstract score(): number;
}

export type Severity = 'Critical' | 'Major' | 'Minor';

// твій код тут: Bug, Story, topIssue
