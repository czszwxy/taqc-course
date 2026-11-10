export type Bug = {
  id: number;
  title: string;
  severity: string;
  status: string;
};

export function closeBug(bug: Bug): Bug {
  return { ...bug, status: 'Closed' };
}
