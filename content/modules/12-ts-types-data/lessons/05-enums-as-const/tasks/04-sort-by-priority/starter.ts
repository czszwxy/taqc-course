export enum Priority {
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
}

export interface PrioritizedCase {
  title: string;
  priority: Priority;
}

export function sortByPriority(cases: PrioritizedCase[]): PrioritizedCase[] {
  // твій код тут
}
