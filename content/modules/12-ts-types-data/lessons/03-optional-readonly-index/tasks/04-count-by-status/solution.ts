export function countByStatus(statuses: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of statuses) {
    counts[s] = (counts[s] ?? 0) + 1;
  }
  return counts;
}
