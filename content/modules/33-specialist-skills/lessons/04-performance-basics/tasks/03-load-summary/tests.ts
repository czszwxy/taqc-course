import { percentile, summarize, type Sample } from './solution';

const ok = (durationMs: number): Sample => ({ durationMs, status: 200 });

describe('percentile', () => {
  it('median of an odd list', () => {
    expect(percentile([300, 100, 200], 50)).toBe(200);
  }, 'Відсортуй копію за зростанням і візьми елемент з номером Math.ceil((p / 100) * n) — нумерація з 1.');

  it('p95 of ten values is the largest one', () => {
    expect(percentile([100, 100, 100, 100, 100, 100, 100, 100, 100, 2000], 95)).toBe(2000);
  }, 'Для 10 значень: Math.ceil(0.95 * 10) = 10 — десятий елемент відсортованого списку.');

  it('p90 of ten values is the ninth one', () => {
    expect(percentile([100, 100, 100, 100, 100, 100, 100, 100, 100, 2000], 90)).toBe(100);
  });

  it('sorts numbers as numbers, not as text', () => {
    expect(percentile([1000, 200, 30], 100)).toBe(1000);
    expect(percentile([1000, 200, 30], 1)).toBe(30);
  }, 'sort() без аргументів порівнює як рядки: "1000" < "200". Передай (a, b) => a - b.');

  it('does not change the input array', () => {
    const values = [300, 100, 200];
    percentile(values, 50);
    expect(values).toEqual([300, 100, 200]);
  }, 'sort() сортує масив на місці — сортуй копію: [...values].sort(...).');

  it('empty list gives 0', () => {
    expect(percentile([], 95)).toBe(0);
  }, 'Порожній масив оброби на початку: return 0.');
});

describe('summarize', () => {
  const samples: Sample[] = [ok(120), ok(480), { durationMs: 300, status: 500 }, ok(100)];

  it('counts requests, errors, average and p95', () => {
    expect(summarize(samples, { p95Ms: 500, maxErrorRate: 0.3 })).toEqual({ requests: 4, errorRate: 0.25, avgMs: 250, p95Ms: 480, passed: true });
  });

  it('4xx responses are errors too', () => {
    expect(summarize([ok(100), { durationMs: 100, status: 404 }], { p95Ms: 500, maxErrorRate: 1 }).errorRate).toBe(0.5);
  }, 'Помилка — статус 400 і вище: s.status >= 400.');

  it('rounds the average', () => {
    expect(summarize([ok(100), ok(101), ok(101)], { p95Ms: 500, maxErrorRate: 0 }).avgMs).toBe(101);
  }, 'avgMs = Math.round(сума / кількість): 302 / 3 = 100.67 → 101.');

  it('fails when p95 is above the limit', () => {
    expect(summarize(samples, { p95Ms: 400, maxErrorRate: 0.3 }).passed).toBe(false);
  }, 'passed вимагає p95Ms <= sla.p95Ms.');

  it('fails when the error rate is above the limit, even if it is fast', () => {
    expect(summarize(samples, { p95Ms: 500, maxErrorRate: 0.1 }).passed).toBe(false);
  }, 'Обидві умови мають виконуватись: і p95, і errorRate.');

  it('passes exactly on the limits', () => {
    expect(summarize(samples, { p95Ms: 480, maxErrorRate: 0.25 }).passed).toBe(true);
  }, 'Межі включно: <=, а не <.');

  it('no data is not a pass', () => {
    expect(summarize([], { p95Ms: 500, maxErrorRate: 0.01 })).toEqual({ requests: 0, errorRate: 0, avgMs: 0, p95Ms: 0, passed: false });
  }, 'Порожній список: усі числа 0 і passed: false — і жодного ділення на нуль.');
});
