export function countRetries(): number {
  const attempts = 0;
  attempts = attempts + 1; // retry 1
  attempts = attempts + 1; // retry 2
  attempts = attempts + 1; // retry 3
  return attempts;
}
