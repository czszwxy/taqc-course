export function getReportLine(suite: string, passed: number, total: number): string {
  const percent: number = Math.round((passed / totl) * 100);
  const status: string = percent === 100 ? 'OK' : 'NEEDS ATTENTION';
  const line: number = suite + ': ' + percent + '% ' + staus;
  return line;
}
