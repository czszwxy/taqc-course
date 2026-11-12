import { getPrices } from './solution';

describe('getPrices', () => {
  it('returns prices of existing products', async () => {
    const report = await getPrices([1, 3]);
    expect(report.prices).toEqual({ 1: 499, 3: 2199 });
    expect(report.notFound).toEqual([]);
  }, 'Для кожного успішного запиту візьми `price` з тіла: `(await res.json()).price`.');

  it('collects 404 ids into notFound', async () => {
    const report = await getPrices([1, 999, 3, 500]);
    expect(report.prices).toEqual({ 1: 499, 3: 2199 });
    expect(report.notFound).toEqual([999, 500]);
  }, '404 — не помилка функції: додай id у `notFound` і йди далі (`continue`).');

  it('returns an empty report for an empty list', async () => {
    expect(await getPrices([])).toEqual({ prices: {}, notFound: [] });
  });

  it('throws on other failed statuses (400)', async () => {
    await expect(getPrices([1, 1.5])).rejects.toThrow();
  }, 'Після перевірки 404: `if (!res.ok) throw new Error(...)`. Id 1.5 дає 400.');
});
