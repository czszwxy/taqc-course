export function addTag(tags: readonly string[], tag: string): readonly string[] {
  return tags.includes(tag) ? tags : [...tags, tag];
}
