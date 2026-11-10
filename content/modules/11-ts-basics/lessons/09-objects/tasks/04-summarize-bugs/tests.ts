import { summarizeBugs } from './solution';

describe('summarizeBugs', () => {
  it('counts open and closed bugs', () => {
    expect(
      summarizeBugs([
        { id: 1, status: 'Open' },
        { id: 2, status: 'Closed' },
        { id: 3, status: 'In Progress' },
      ]),
    ).toEqual({ total: 3, open: 2, closed: 1 });
  }, "'In Progress' теж рахується як open: усе, що не 'Closed'.");

  it('treats Reopened as open', () => {
    expect(
      summarizeBugs([
        { id: 1, status: 'Reopened' },
        { id: 2, status: 'Closed' },
      ]),
    ).toEqual({ total: 2, open: 1, closed: 1 });
  });

  it('all closed', () => {
    expect(
      summarizeBugs([
        { id: 1, status: 'Closed' },
        { id: 2, status: 'Closed' },
      ]),
    ).toEqual({ total: 2, open: 0, closed: 2 });
  });

  it('empty list → all zeros', () => {
    expect(summarizeBugs([])).toEqual({ total: 0, open: 0, closed: 0 });
  }, 'Для порожнього масиву всі лічильники мають бути 0.');
});
