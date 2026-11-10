import { assignBug, type Bug } from './solution';

const makeBug = (): Bug => ({ id: 9, title: 'Slow search', status: 'Open' });

describe('assignBug', () => {
  it('sets assignee and status', () => {
    expect(assignBug(makeBug(), 'Andrii')).toEqual({ id: 9, title: 'Slow search', status: 'In Progress', assignee: 'Andrii' });
  });

  it('does not mutate the original bug', () => {
    const bug = makeBug();
    assignBug(bug, 'Andrii');
    expect(bug).toEqual({ id: 9, title: 'Slow search', status: 'Open' });
  }, 'Поверни копію через spread, а не змінюй bug.');

  it('reassigns an already assigned bug', () => {
    const bug: Bug = { id: 2, title: 'X', status: 'In Progress', assignee: 'Iryna' };
    expect(assignBug(bug, 'Oleh').assignee).toBe('Oleh');
  });
});
