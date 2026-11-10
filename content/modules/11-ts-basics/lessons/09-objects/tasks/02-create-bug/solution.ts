export type Bug = {
  id: number;
  title: string;
  severity: string;
  status: string;
};

export function createBug(id: number, title: string, severity: string): Bug {
  return { id, title: title.trim(), severity, status: 'Open' };
}
