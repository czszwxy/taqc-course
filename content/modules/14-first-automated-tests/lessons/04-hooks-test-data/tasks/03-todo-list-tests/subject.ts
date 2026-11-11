export interface Todo {
  id: number;
  text: string;
  done: boolean;
}

export class TodoList {
  private nextId = 1;
  items: Todo[] = [];

  add(text: string): Todo {
    const trimmed = text.trim();
    if (!trimmed) throw new Error('Task text is required');
    const todo: Todo = { id: this.nextId, text: trimmed, done: false };
    this.nextId += 1;
    this.items.push(todo);
    return todo;
  }

  complete(id: number): void {
    const todo = this.items.find((t) => t.id === id);
    if (!todo) throw new Error(`Task ${id} not found`);
    todo.done = true;
  }

  remove(id: number): void {
    this.items = this.items.filter((t) => t.id !== id);
  }

  activeCount(): number {
    return this.items.filter((t) => !t.done).length;
  }
}
