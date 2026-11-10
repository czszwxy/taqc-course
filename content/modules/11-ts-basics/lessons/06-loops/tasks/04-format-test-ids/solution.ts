export function formatTestIds(count: number): string {
  let result = '';
  for (let i = 1; i <= count; i++) {
    if (i > 1) {
      result += ',';
    }
    result += `TC-${String(i).padStart(2, '0')}`;
  }
  return result;
}
