export interface Issue {
  id: number;
  title: string;
}

export interface Bug extends Issue {
  severity: string;
  stepsToReproduce: string[];
}

export function bugSummary(bug: Bug): string {
  return `#${bug.id} [${bug.severity}] ${bug.title} (${bug.stepsToReproduce.length} steps)`;
}
