export function getInitials(fullName: string): string {
  const words: string[] = [];
  for (const part of fullName.split(' ')) {
    if (part !== '') {
      words.push(part);
    }
  }
  if (words.length === 0) {
    return '';
  }
  const first = words[0][0].toUpperCase();
  if (words.length === 1) {
    return first;
  }
  return first + words[words.length - 1][0].toUpperCase();
}
