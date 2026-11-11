import { runConfig, reportName } from './solution';

describe('resolved run config', () => {
  it('keeps timeout and retries from main', () => {
    expect(runConfig.timeoutMs).toBe(30000);
    expect(runConfig.retries).toBe(2);
  }, 'Команда вирішила залишити timeoutMs і retries з main (верхня частина): 30000 і 2.');

  it('adds workers from your branch', () => {
    expect(runConfig).toHaveProperty('workers', 4);
  }, 'workers: 4 — зміна з твоєї гілки (нижня частина), її треба зберегти.');

  it('keeps baseUrl', () => {
    expect(runConfig.baseUrl).toBe('https://staging.gadgetly.test');
  });
});

describe('resolved reportName', () => {
  it('uses the report-<suite>.html format from main', () => {
    expect(reportName('smoke')).toBe('report-smoke.html');
    expect(reportName('regression')).toBe('report-regression.html');
  }, 'Формат з main: `report-${suite}.html` — дашборд шукає саме його.');
});
