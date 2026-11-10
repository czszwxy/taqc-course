export function getAverageDuration(durations: number[]): number {
  if (durations.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const d of durations) {
    sum += d;
  }
  return Math.round(sum / durations.length);
}
