import { BugReport } from './solution';

describe('BugReport', () => {
  it('stores constructor values and defaults', () => {
    const bug = new BugReport(12, 'Total is wrong');
    expect(bug.id).toBe(12);
    expect(bug.title).toBe('Total is wrong');
    expect(bug.status).toBe('New');
    expect(bug.assignee).toBeNull();
  }, "Початкові значення: status = 'New', assignee = null.");
  it('assign sets assignee and status', () => {
    const bug = new BugReport(1, 'A');
    bug.assign('Andrii');
    expect(bug.assignee).toBe('Andrii');
    expect(bug.status).toBe('Assigned');
  });
  it('close and isOpen', () => {
    const bug = new BugReport(1, 'A');
    expect(bug.isOpen()).toBe(true);
    bug.close();
    expect(bug.status).toBe('Closed');
    expect(bug.isOpen()).toBe(false);
  });
});
