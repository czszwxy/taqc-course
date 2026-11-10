export function getReportLine(suite: string, passed: number, total: number): string {
  const percent: number = Math.round((passed / total) * 100);
  const status: string = percent === 100 ? 'OK' : 'NEEDS ATTENTION';
  const line: string = suite + ': ' + percent + '% ' + status;
  return line;
}
