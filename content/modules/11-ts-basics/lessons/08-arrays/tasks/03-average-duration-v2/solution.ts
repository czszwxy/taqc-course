export function getMaxDuration(durations: number[]): number {
  if (durations.length === 0) {
    return 0;
  }
  let max = durations[0];
  for (const d of durations) {
    if (d > max) {
      max = d;
    }
  }
  return max;
}
