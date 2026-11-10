export function countDigits(text: string): number {
  let count = 0;
  for (const ch of text) {
    if (ch >= '0' && ch <= '9') {
      count++;
    }
  }
  return count;
}
