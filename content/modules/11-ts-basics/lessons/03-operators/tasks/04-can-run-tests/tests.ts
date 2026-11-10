import { canRunTests } from './solution';

describe('canRunTests — decision table', () => {
  it('green build + env up → runs', () => {
    expect(canRunTests(true, true, false)).toBe(true);
  });

  it('green build, env down, no override → does not run', () => {
    expect(canRunTests(true, false, false)).toBe(false);
  }, 'Без override потрібні ОБИДВІ умови: білд і середовище.');

  it('red build, env up, no override → does not run', () => {
    expect(canRunTests(false, true, false)).toBe(false);
  }, 'Червоний білд блокує запуск, якщо немає override.');

  it('red build, env down, no override → does not run', () => {
    expect(canRunTests(false, false, false)).toBe(false);
  });

  it('override always allows running (all 4 combinations)', () => {
    expect(canRunTests(true, true, true)).toBe(true);
    expect(canRunTests(true, false, true)).toBe(true);
    expect(canRunTests(false, true, true)).toBe(true);
    expect(canRunTests(false, false, true)).toBe(true);
  }, 'Override має переважувати все інше: додай "|| hasOverride".');
});
