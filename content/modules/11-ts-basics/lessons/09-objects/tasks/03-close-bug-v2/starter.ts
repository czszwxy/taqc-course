export type Bug = {
  id: number;
  title: string;
  status: string;
  assignee?: string;
};

export function assignBug(bug: Bug, assignee: string): Bug {
  // поверни НОВИЙ об'єкт
}
