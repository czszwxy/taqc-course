export function normalizeUsername(name: string): string {
  return name.trim().toLowerCase().replaceAll(' ', '_');
}
