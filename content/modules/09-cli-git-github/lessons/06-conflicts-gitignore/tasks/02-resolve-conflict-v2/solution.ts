export const runConfig = {
  baseUrl: 'https://staging.gadgetly.test',
  timeoutMs: 30000,
  retries: 2,
  workers: 4,
};

export function reportName(suite: string): string {
  return `report-${suite}.html`;
}
