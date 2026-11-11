import { TodoList } from './subject';

describe('TodoList', () => {
  // твій код тут: let list: TodoList; і beforeEach(...)

  it('adds a task', () => {
    const list = new TodoList();
    list.add('Buy milk');
    expect(list.items).toHaveLength(1);
  });
});
