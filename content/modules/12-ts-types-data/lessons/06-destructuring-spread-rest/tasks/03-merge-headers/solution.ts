export function mergeHeaders(...sources: Record<string, string>[]): Record<string, string> {
  return sources.reduce<Record<string, string>>((acc, s) => ({ ...acc, ...s }), {});
}
