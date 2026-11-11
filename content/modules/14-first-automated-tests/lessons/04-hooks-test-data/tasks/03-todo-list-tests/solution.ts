import { TodoList } from './subject';

describe('TodoList', () => {
  let list: TodoList;

  beforeEach(() => {
    list = new TodoList();
  });

  it('adds a trimmed task', () => {
    const task = list.add('  Buy milk ');
    expect(task).toEqual({ id: 1, text: 'Buy milk', done: false });
  });

  it('rejects an empty task', () => {
    expect(() => list.add('   ')).toThrow('Task text is required');
  });

  it('completes the given task only', () => {
    list.add('A');
    const b = list.add('B');
    list.add('C');
    list.complete(b.id);
    expect(list.items.map((t) => t.done)).toEqual([false, true, false]);
  });

  it('removes the given task only', () => {
    list.add('A');
    const b = list.add('B');
    list.add('C');
    list.remove(b.id);
    expect(list.items.map((t) => t.text)).toEqual(['A', 'C']);
  });

  it('counts only active tasks', () => {
    const a = list.add('A');
    list.add('B');
    list.complete(a.id);
    expect(list.activeCount()).toBe(1);
  });
});
