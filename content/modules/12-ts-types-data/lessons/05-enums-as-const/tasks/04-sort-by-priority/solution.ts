export enum Priority {
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
}

export interface PrioritizedCase {
  title: string;
  priority: Priority;
}

const RANK: Record<Priority, number> = { [Priority.High]: 0, [Priority.Medium]: 1, [Priority.Low]: 2 };

export function sortByPriority(cases: PrioritizedCase[]): PrioritizedCase[] {
  return [...cases].sort((a, b) => RANK[a.priority] - RANK[b.priority]);
}
