export function runStep(name: string, fn: () => void, log: string[]): boolean {
  log.push(`start ${name}`);
  try {
    fn();
    log.push(`pass ${name}`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.push(`fail ${name}: ${message}`);
    return false;
  } finally {
    log.push(`end ${name}`);
  }
}
