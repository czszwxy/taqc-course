export function getFixDeadlineDays(severity: string): number {
  const s = severity.trim().toLowerCase();
  switch (s) {
    case 'blocker':
      return 1;
    case 'critical':
      return 2;
    case 'major':
      return 7;
    case 'minor':
      return 30;
    case 'trivial':
      return 90;
    default:
      return -1;
  }
}
