export function retry<T>(fn: () => T, attempts: number): T {
  if (attempts < 1) throw new RangeError('attempts must be at least 1');
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return fn();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
