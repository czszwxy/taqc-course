export function formatTestName(name: string, tag?: string): string {
  if (tag) {
    return `${name} @${tag}`;
  }
  return name;
}
