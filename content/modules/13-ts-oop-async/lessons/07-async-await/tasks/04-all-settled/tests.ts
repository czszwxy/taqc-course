import { checkServices } from './solution';

describe('checkServices', () => {
  it('splits services into up and down', async () => {
    expect(await checkServices(['api', 'payments', 'search'])).toEqual({ up: ['api', 'search'], down: ['payments'] });
  }, 'Promise.allSettled повертає результат для кожного сервісу — і для тих, що впали.');
  it('never rejects', async () => {
    expect(await checkServices(['payments', 'billing'])).toEqual({ up: [], down: ['payments', 'billing'] });
  });
  it('all up', async () => {
    expect(await checkServices(['auth', 'api'])).toEqual({ up: ['auth', 'api'], down: [] });
  });
});
