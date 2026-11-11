export enum Severity {
  Blocker = 'Blocker',
  Critical = 'Critical',
  Major = 'Major',
  Minor = 'Minor',
  Trivial = 'Trivial',
}

export function isUrgent(sev: Severity): boolean {
  return sev === Severity.Blocker || sev === Severity.Critical;
}

export function allSeverities(): Severity[] {
  return Object.values(Severity);
}
