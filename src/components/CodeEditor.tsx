import { lazy, Suspense, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactElement } from 'react';
import { useSettings } from '../features/progress/store';

const MonacoCodeEditor = lazy(() => import('./MonacoCodeEditor'));

/**
 * The code editor of code tasks (TypeScript, Python, Playwright). On a computer it is Monaco (VS Code's editor);
 * on a touch screen it is a simple editor made for phone keyboards: no autocorrect / auto-capitalisation,
 * line numbers, auto-indent on Enter and a row of buttons for characters that are hard to reach on a phone.
 * The learner can switch modes (toolbar button or Settings); the text is kept when switching.
 */

export type EditorLanguage = 'typescript' | 'python' | 'html';

/** What a task view can do with its editor, whichever editor is shown. */
export interface CodeEditorHandle {
  setValue: (value: string) => void;
}

export interface CodeEditorProps {
  /** Monaco model path, e.g. file:///<task id>/solution.ts — support files are resolved next to it. */
  path: string;
  language: EditorLanguage;
  initialValue: string;
  tabSize: number;
  onChange: (value: string) => void;
  /** Ctrl+Enter. */
  onSubmit: () => void;
  /** Called with the editor's handle when it is ready (and again after a switch between the editors). */
  onReady: (handle: CodeEditorHandle) => void;
}

const TOUCH_QUERY = '(pointer: coarse)';

function prefersTouch(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(TOUCH_QUERY).matches;
}

/** true when the simple editor is shown: chosen in Settings, or "auto" on a touch screen. */
export function useSimpleEditor(): boolean {
  const mode = useSettings((s) => s.editorMode);
  const [touch, setTouch] = useState(prefersTouch);
  useEffect(() => {
    const query = window.matchMedia(TOUCH_QUERY);
    const update = (): void => setTouch(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return mode === 'simple' || (mode === 'auto' && touch);
}

/** Toolbar button that switches between the simple and the full editor. */
export function EditorModeToggle(): ReactElement {
  const simple = useSimpleEditor();
  const setEditorMode = useSettings((s) => s.setEditorMode);
  const title = simple ? 'Switch to the full editor (VS Code style, best with a keyboard)' : 'Switch to the simple editor (best on a phone)';
  return (
    <button className="btn btn-ghost btn-sm" onClick={() => setEditorMode(simple ? 'full' : 'simple')} title={title} aria-label={title}>
      <span aria-hidden="true">{simple ? '🖥️' : '📱'}</span>
    </button>
  );
}

export function CodeEditor(props: CodeEditorProps): ReactElement {
  const simple = useSimpleEditor();
  // The latest text survives a switch between the two editors.
  const latest = useRef(props.initialValue);
  const onChange = (value: string): void => {
    latest.current = value;
    props.onChange(value);
  };
  const shared = { ...props, initialValue: latest.current, onChange };
  if (simple) return <SimpleCodeEditor key="simple" {...shared} />;
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted">Loading editor…</div>}>
      <MonacoCodeEditor key="full" {...shared} />
    </Suspense>
  );
}

/* ---------- simple editor for touch screens ---------- */

/** Characters that are hard to reach on a phone keyboard, per language. */
const EXTRA_KEYS: Record<EditorLanguage, string[]> = {
  python: [':', '(', ')', '"', "'", '=', '[', ']', '{', '}', '.', ',', '_', '#'],
  typescript: ['(', ')', '{', '}', '[', ']', ';', "'", '"', '`', '=', '>', '.', ','],
  html: ['<', '>', '/', '{', '}', '%', '|', '"', '=', '.', '-', '_'],
};

/** A line ending with one of these opens a block: the next line gets one more indent. */
const BLOCK_OPENERS: Record<EditorLanguage, string[]> = {
  python: [':'],
  typescript: ['{', '(', '['],
  // Templates keep the indentation of the previous line: a closing tag also ends with ">".
  html: [],
};

/*
 * Leading spaces of a line: matches "    " in "    return total" and "" in "def total():".
 * https://regex101.com/?regex=%5E%20*
 */
const LEADING_SPACES = /^ */;

/** Indentation for the line after `line`: the same as `line`, plus one level after a block opener. */
export function indentAfter(line: string, tabSize: number, language: EditorLanguage): string {
  const base = LEADING_SPACES.exec(line)?.[0] ?? '';
  const opensBlock = BLOCK_OPENERS[language].some((opener) => line.trimEnd().endsWith(opener));
  return opensBlock ? base + ' '.repeat(tabSize) : base;
}

/** Index where the line containing `caret` starts. */
function lineStart(text: string, caret: number): number {
  return text.lastIndexOf('\n', caret - 1) + 1;
}

/** The text of the line the caret is on, up to the caret. */
function lineBeforeCaret(text: string, caret: number): string {
  return text.slice(lineStart(text, caret), caret);
}

/** How many spaces take the indentation back to the previous tab stop: 4 → 4, 6 → 2, 0 → 0 (tab size 4). */
export function spacesToPreviousStop(indent: number, tabSize: number): number {
  return indent % tabSize || Math.min(tabSize, indent);
}

function lineNumbers(text: string): string {
  return Array.from({ length: text.split('\n').length }, (_, i) => i + 1).join('\n');
}

/**
 * Types `text` over the selection the way the keyboard would: the value and the caret change at once (so fast typing
 * right after it lands in the right place) and Ctrl+Z still works. Falls back to setRangeText where insertText is missing.
 */
function typeInto(area: HTMLTextAreaElement, text: string): void {
  area.focus();
  if (document.execCommand('insertText', false, text)) return;
  area.setRangeText(text, area.selectionStart, area.selectionEnd, 'end');
  area.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Deletes the text between `from` and `to` the same way. */
function deleteRange(area: HTMLTextAreaElement, from: number, to: number): void {
  area.focus();
  area.setSelectionRange(from, to);
  if (document.execCommand('delete')) return;
  area.setRangeText('', from, to, 'end');
  area.dispatchEvent(new Event('input', { bubbles: true }));
}

function SimpleCodeEditor({ language, initialValue, tabSize, onChange, onSubmit, onReady }: CodeEditorProps): ReactElement {
  const [value, setValue] = useState(initialValue);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLPreElement>(null);

  const update = (next: string): void => {
    setValue(next);
    onChange(next);
  };

  useEffect(() => {
    onReady({ setValue: (next) => update(next) });
  });

  /** Replaces the selection with `text` and puts the caret after it. */
  const insert = (text: string): void => {
    if (areaRef.current) typeInto(areaRef.current, text);
  };

  /** Moves the caret's line one indentation level to the left (the ⇤ button). */
  const outdent = (): void => {
    const area = areaRef.current;
    if (!area) return;
    const caret = area.selectionStart;
    const start = lineStart(area.value, caret);
    const indent = LEADING_SPACES.exec(area.value.slice(start))?.[0].length ?? 0;
    const remove = spacesToPreviousStop(indent, tabSize);
    if (remove === 0) return;
    deleteRange(area, start, start + remove);
    const next = Math.max(start, caret - remove);
    area.setSelectionRange(next, next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.nativeEvent.isComposing) return;
    const area = e.currentTarget;
    const { selectionStart, selectionEnd } = area;
    // Read the text from the field itself: it is always up to date, even between two fast key presses.
    const before = lineBeforeCaret(area.value, selectionStart);
    // Backspace inside the indentation deletes a whole level, like in code editors.
    if (e.key === 'Backspace' && selectionStart === selectionEnd && before.length > 0 && before.trim() === '') {
      e.preventDefault();
      deleteRange(area, selectionStart - spacesToPreviousStop(before.length, tabSize), selectionStart);
      return;
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSubmit();
      return;
    }
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      insert(' '.repeat(tabSize));
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      insert(`\n${indentAfter(before, tabSize, language)}`);
    }
  };

  // Tapping a key button must not take the focus away from the text (the phone keyboard would close).
  const keepFocus = (e: MouseEvent<HTMLButtonElement>): void => e.preventDefault();

  return (
    <div className="flex h-full flex-col bg-[#fffdf7] dark:bg-[#0b1628]">
      <div className="scroll-thin flex shrink-0 gap-1 overflow-x-auto border-b border-line bg-surface px-2 py-1.5" aria-label="Extra keys">
        <button type="button" className="btn btn-ghost btn-sm shrink-0 font-mono" onMouseDown={keepFocus} onClick={() => insert(' '.repeat(tabSize))} title="Indent">
          ⇥ Tab
        </button>
        <button type="button" className="btn btn-ghost btn-sm shrink-0 font-mono" onMouseDown={keepFocus} onClick={outdent} title="Remove one indentation level">
          ⇤
        </button>
        {EXTRA_KEYS[language].map((key) => (
          <button key={key} type="button" className="btn btn-ghost btn-sm min-w-9 shrink-0 font-mono" onMouseDown={keepFocus} onClick={() => insert(key)}>
            {key}
          </button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 font-mono text-[16px] leading-6 [font-variant-ligatures:none]">
        <pre
          ref={gutterRef}
          aria-hidden="true"
          className="m-0 shrink-0 select-none overflow-hidden py-3 pl-2 pr-3 text-right text-[#a79f8c] dark:text-[#5b6f96]"
        >
          {lineNumbers(value)}
        </pre>
        <textarea
          ref={areaRef}
          value={value}
          onChange={(e) => update(e.target.value)}
          onKeyDown={onKeyDown}
          onScroll={(e) => {
            if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop;
          }}
          aria-label="Code editor"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          wrap="off"
          className="scroll-thin min-w-0 flex-1 resize-none whitespace-pre bg-transparent py-3 pr-3 text-fg caret-current outline-none"
        />
      </div>
    </div>
  );
}
