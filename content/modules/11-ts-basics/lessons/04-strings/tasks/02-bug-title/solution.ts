export function formatBugTitle(component: string, summary: string): string {
  return `[${component.trim().toUpperCase()}] ${summary.trim()}`;
}
