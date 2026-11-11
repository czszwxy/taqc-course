import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { PlaygroundShell, FieldError, inputClass, isFixedMode, withLabMode } from './PlaygroundShell';

/**
 * Bug Playground: Taskly to-do list with 6 INTENTIONAL bugs (catalogued in
 * content/modules/06-qa-practice-lab/lessons/09-todo-mini-project/tasks/03-bug-hunt/task.json).
 * Open with `?fixed` for the correct implementation. Keep this file and the bug catalog in sync.
 * Tasks are saved in localStorage (separate keys for the buggy and the fixed build).
 */

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

type Filter = 'all' | 'active' | 'completed';

const MAX_LENGTH = 100;
const BUGGY_MAX_LENGTH = 99;
const STORAGE_KEY = 'qa-playground:todo';
const FIXED_STORAGE_KEY = 'qa-playground:todo-fixed';
const SEED_TASKS: Array<Omit<Todo, 'id'>> = [
  { text: 'Write test cases for the login page', done: true },
  { text: 'Report the cart bug', done: false },
  { text: 'Buy coffee', done: false },
];
const SEED: Todo[] = SEED_TASKS.map((t, i) => ({ ...t, id: i + 1 }));
const FILTER_LABELS: Record<Filter, string> = { all: 'All', active: 'Active', completed: 'Completed' };
const FILTER_TESTS: Record<Filter, (t: Todo) => boolean> = {
  all: () => true,
  active: (t) => !t.done,
  completed: (t) => t.done,
};

function getBugs(fixed: boolean) {
  const on = !fixed;
  return {
    maxLength: on, // a task of exactly 100 characters is rejected
    plural: on, // counter says "1 items left"
    counterAfterDelete: on, // counter does not decrease when an active task is deleted
    clearAll: on, // "Clear completed" deletes all tasks
    escSaves: on, // Esc while editing saves instead of cancelling
    doneNotSaved: on, // completed state is lost after a page reload
  };
}
type Bugs = ReturnType<typeof getBugs>;

function storageKey(fixed: boolean): string {
  return fixed ? FIXED_STORAGE_KEY : STORAGE_KEY;
}

function load(fixed: boolean): Todo[] {
  try {
    const raw = localStorage.getItem(storageKey(fixed));
    if (!raw) return SEED;
    const parsed = JSON.parse(raw) as Array<Partial<Todo>>;
    return parsed.map((t, i) => ({ id: t.id ?? i + 1, text: String(t.text ?? ''), done: Boolean(t.done) }));
  } catch {
    return SEED;
  }
}

function save(items: Todo[], fixed: boolean, bug: Bugs): void {
  const stored = bug.doneNotSaved ? items.map(({ id, text }) => ({ id, text })) : items;
  try {
    localStorage.setItem(storageKey(fixed), JSON.stringify(stored));
  } catch {
    /* storage unavailable — the demo still works in memory */
  }
}

function validateText(raw: string, bug: Bugs): string | null {
  const text = raw.trim();
  const max = bug.maxLength ? BUGGY_MAX_LENGTH : MAX_LENGTH;
  if (!text) return "Task can't be empty";
  if (text.length > max) return `Task is too long (max ${MAX_LENGTH} characters)`;
  return null;
}

function counterText(count: number, bug: Bugs): string {
  const word = count === 1 && !bug.plural ? 'item' : 'items';
  return `${count} ${word} left`;
}

export function TodoPage() {
  const fixed = isFixedMode();
  const bug = withLabMode(getBugs(fixed));

  const [items, setItems] = useState<Todo[]>(() => load(fixed));
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<{ id: number; text: string; error: string | null } | null>(null);
  const [deletedActive, setDeletedActive] = useState(0);

  useEffect(() => save(items, fixed, bug), [items]); // eslint-disable-line react-hooks/exhaustive-deps

  const nextId = items.reduce((max, t) => Math.max(max, t.id), 0) + 1;
  const activeCount = items.filter((t) => !t.done).length + (bug.counterAfterDelete ? deletedActive : 0);
  const hasCompleted = items.some((t) => t.done);
  const visible = items.filter(FILTER_TESTS[filter]);

  const add = (ev: FormEvent) => {
    ev.preventDefault();
    const problem = validateText(draft, bug);
    setError(problem);
    if (problem) return;
    setItems((prev) => [...prev, { id: nextId, text: draft.trim(), done: false }]);
    setDraft('');
  };

  const toggle = (id: number) => setItems((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const remove = (todo: Todo) => {
    if (!todo.done) setDeletedActive((n) => n + 1);
    setItems((prev) => prev.filter((t) => t.id !== todo.id));
  };

  const clearCompleted = () => setItems((prev) => (bug.clearAll ? [] : prev.filter((t) => !t.done)));

  const saveEdit = () => {
    if (!editing) return;
    const problem = validateText(editing.text, bug);
    if (problem) {
      setEditing({ ...editing, error: problem });
      return;
    }
    setItems((prev) => prev.map((t) => (t.id === editing.id ? { ...t, text: editing.text.trim() } : t)));
    setEditing(null);
  };

  const cancelEdit = () => setEditing(null);

  const onEditKey = (ev: KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === 'Enter') saveEdit();
    if (ev.key === 'Escape') (bug.escSaves ? saveEdit : cancelEdit)();
  };

  const reset = () => {
    setItems(SEED);
    setDraft('');
    setError(null);
    setFilter('all');
    setEditing(null);
    setDeletedActive(0);
  };

  const requirements = (
    <>
      <li>
        <b>Add</b> a task with Enter or the Add button. Text: <b>1–100 characters</b> (spaces at the start/end are ignored). Empty → “Task can't be
        empty”; longer than 100 → “Task is too long (max 100 characters)”. New tasks go to the bottom.
      </li>
      <li>The checkbox marks a task as completed (crossed out); clicking again makes it active.</li>
      <li>
        <b>Edit</b>: Enter or Save saves the new text (same 1–100 rule); <b>Esc</b> or Cancel discards the changes.
      </li>
      <li>
        <b>Delete</b> (×) removes one task.
      </li>
      <li>
        Filters <b>All / Active / Completed</b> show the matching tasks.
      </li>
      <li>
        Counter “<b>N items left</b>” = number of <b>active</b> tasks; for exactly one task it says “1 item left”.
      </li>
      <li>
        <b>Clear completed</b> removes only completed tasks; it is shown only when there is at least one completed task.
      </li>
      <li>
        Tasks and their completed state are <b>kept after a page reload</b>.
      </li>
    </>
  );

  return (
    <PlaygroundShell brand="taskly" fixed={fixed} requirements={requirements} onReset={reset}>
      <h1 className="text-2xl font-bold">My tasks</h1>

      <form onSubmit={add} noValidate className="mt-4" data-testid="todo-form">
        <label htmlFor="new-todo" className="sr-only">
          New task
        </label>
        <div className="flex gap-2">
          <input
            id="new-todo"
            data-testid="todo-input"
            placeholder="What needs to be done?"
            className={inputClass(Boolean(error))}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" data-testid="todo-add" className="rounded-md bg-teal-600 px-4 font-semibold text-white hover:bg-teal-700">
            Add
          </button>
        </div>
        <div className="mt-1 flex justify-between text-xs text-slate-500">
          <FieldError id="todo-input" message={error ?? undefined} />
          <span className="ml-auto" data-testid="todo-length">
            {draft.trim().length}/{MAX_LENGTH}
          </span>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap gap-1" role="tablist" aria-label="Filter tasks">
        {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            data-testid={`filter-${f}`}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1 text-sm ${filter === f ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200" data-testid="todo-list">
        {visible.length === 0 && <li className="p-4 text-center text-sm text-slate-400">No tasks here</li>}
        {visible.map((t) => (
          <li key={t.id} data-testid="todo-item" className="flex items-center gap-3 px-3 py-2.5">
            <input
              type="checkbox"
              aria-label={`Mark “${t.text}” as completed`}
              data-testid="todo-toggle"
              className="h-4 w-4 accent-teal-600"
              checked={t.done}
              onChange={() => toggle(t.id)}
            />
            {editing?.id === t.id ? (
              <div className="flex-1">
                <div className="flex gap-2">
                  <input
                    autoFocus
                    aria-label="Edit task"
                    data-testid="todo-edit-input"
                    className={inputClass(Boolean(editing.error))}
                    value={editing.text}
                    onChange={(e) => setEditing({ ...editing, text: e.target.value, error: null })}
                    onKeyDown={onEditKey}
                  />
                  <button type="button" data-testid="todo-save" onClick={saveEdit} className="rounded-md bg-teal-600 px-3 text-sm font-semibold text-white">
                    Save
                  </button>
                  <button type="button" data-testid="todo-cancel" onClick={cancelEdit} className="rounded-md border border-slate-300 px-3 text-sm">
                    Cancel
                  </button>
                </div>
                <FieldError id="todo-edit" message={editing.error ?? undefined} />
              </div>
            ) : (
              <>
                <span data-testid="todo-text" className={`flex-1 break-words ${t.done ? 'text-slate-400 line-through' : ''}`}>
                  {t.text}
                </span>
                <button type="button" data-testid="todo-edit" onClick={() => setEditing({ id: t.id, text: t.text, error: null })} className="text-sm text-teal-700 hover:underline">
                  Edit
                </button>
                <button type="button" aria-label={`Delete “${t.text}”`} data-testid="todo-delete" onClick={() => remove(t)} className="px-1 text-lg text-slate-400 hover:text-red-600">
                  ×
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
        <span data-testid="todo-counter">{counterText(activeCount, bug)}</span>
        {hasCompleted && (
          <button type="button" data-testid="clear-completed" onClick={clearCompleted} className="hover:underline">
            Clear completed
          </button>
        )}
      </div>
    </PlaygroundShell>
  );
}
