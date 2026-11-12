import { useEffect, useMemo, useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { monaco } from '../../monaco/setup';
import type { PlaywrightTask } from '../../content/schema';
import { loadTaskCode } from '../../content/loader';
import { useProgress, useSettings } from '../progress/store';
import { CodeBlock, Markdown } from '../../components/Markdown';
import { Callout } from '../../components/ui';
import { useAsync } from '../../lib/useAsync';
import { Collapsible, ExplanationPanel, HintsPanel, NextActions, PlaygroundLink } from '../tasks/shared';
import type { TaskViewProps } from '../tasks/types';
import type { LabRunResult, LabStatus, LabTestResult } from '../../../server/lab-types';
import { fetchLabStatus, runInLab } from './client';
import { gradeLabRun, type PlaywrightGrade } from './grade';
import { addPlaywrightTypes } from './monaco-types';

type EditorInstance = Parameters<OnMount>[0];

/** The reference spec can be revealed after this many failed checks (or earlier with a confirmation). */
const REVEAL_AFTER_FAILS = 3;
const DRAFT_SAVE_DELAY_MS = 400;
const SPEC_FILE = 'lab.spec.ts';
const MS_PER_SECOND = 1000;
const EDITOR_FONT_SIZE = 14;
const EDITOR_TAB_SIZE = 2;
const EDITOR_PADDING_TOP = 12;

/** Same editor look as the TypeScript code tasks. */
const EDITOR_OPTIONS = {
  minimap: { enabled: false },
  fontSize: EDITOR_FONT_SIZE,
  fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
  scrollBeyondLastLine: false,
  tabSize: EDITOR_TAB_SIZE,
  automaticLayout: true,
  padding: { top: EDITOR_PADDING_TOP },
  renderLineHighlight: 'line',
} as const;

interface Outcome {
  kind: 'run' | 'check';
  run: LabRunResult;
  grade: PlaywrightGrade | null;
}

const STATUS_ICON: Record<LabTestResult['status'], string> = {
  passed: '✓',
  failed: '✗',
  timedOut: '⏱',
  skipped: '–',
  interrupted: '✗',
};

/** " and red on the broken version — …" / " and red on all 4 broken versions — …" / "" when the task has no mutants. */
function brokenVersionsText(count: number): string {
  if (count === 0) return '';
  if (count === 1) return ' and red on the broken version — the bug is caught';
  return ` and red on all ${count} broken versions — every bug is caught`;
}

function seconds(ms: number): string {
  return `${(ms / MS_PER_SECOND).toFixed(1)} s`;
}

export default function PlaywrightTaskView({ ct, header, onSimilar, next }: TaskViewProps) {
  const task = ct.task as PlaywrightTask;
  const files = useAsync(() => loadTaskCode(ct.id), [ct.id]);
  const [statusKey, setStatusKey] = useState(0);
  const labStatus = useAsync(() => fetchLabStatus(), [statusKey]);
  const theme = useSettings((s) => s.theme);
  const progress = useProgress((s) => s.tasks[ct.id]);
  const recordAttempt = useProgress((s) => s.recordAttempt);
  const saveDraft = useProgress((s) => s.saveDraft);
  const markSolutionViewed = useProgress((s) => s.markSolutionViewed);

  const codeRef = useRef('');
  const editorRef = useRef<EditorInstance | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const [busy, setBusy] = useState<null | 'run' | 'check'>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => addPlaywrightTypes(), []);

  const initialCode = useMemo(() => {
    if (!files.data) return '';
    const draft = useProgress.getState().drafts[ct.id];
    return typeof draft === 'string' ? draft : files.data.starter;
  }, [files.data, ct.id]);

  useEffect(() => {
    codeRef.current = initialCode;
  }, [initialCode]);

  const onChange = (value?: string) => {
    codeRef.current = value ?? '';
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveDraft(ct.id, codeRef.current), DRAFT_SAVE_DELAY_MS);
  };

  const execute = async (kind: 'run' | 'check') => {
    if (!files.data || busy) return;
    setBusy(kind);
    saveDraft(ct.id, codeRef.current);
    const code = codeRef.current;
    const bugs = kind === 'check' ? task.mutants.map((m) => m.id) : [];
    const run = await runInLab(code, bugs);
    const grade = run.ok ? gradeLabRun(task, code, run) : null;
    setOutcome({ kind, run, grade });
    setBusy(null);
    if (kind === 'check' && run.ok && grade) recordAttempt(ct.id, grade.passed);
    if (!run.ok && run.reason === 'setup') setStatusKey((k) => k + 1);
  };

  const checkRef = useRef(execute);
  checkRef.current = execute;

  const onMount: OnMount = (editor) => {
    editorRef.current = editor;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => void checkRef.current('check'));
  };

  const reset = () => {
    if (!files.data) return;
    if (!confirm('Reset the editor to the starting code? Your current code will be lost.')) return;
    editorRef.current?.setValue(files.data.starter);
    setOutcome(null);
  };

  const failed = progress?.failedAttempts ?? 0;
  const solved = progress?.status === 'solved';

  const revealSolution = () => {
    if (!solved && failed < REVEAL_AFTER_FAILS && !confirm('Try at least 3 times before looking at the reference tests. Show them anyway?')) return;
    markSolutionViewed(ct.id);
    setShowSolution(true);
  };

  if (files.error) return <div className="p-8 text-bad">Could not load the task files: {files.error}</div>;

  return (
    <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(340px,2fr)_3fr]">
      <section className="scroll-thin min-h-0 overflow-y-auto border-line p-5 lg:border-r lg:p-6">
        {header}
        <Markdown compact>{task.statement}</Markdown>
        <PlaygroundLink id={task.playground} />
        <div className="mt-5 space-y-3">
          {labStatus.data && !labStatus.data.ready && <SetupCallout status={labStatus.data} onRecheck={() => setStatusKey((k) => k + 1)} />}
          <HintsPanel taskId={ct.id} hints={task.hints} />
          {task.explanation && (failed > 0 || solved) && <ExplanationPanel text={task.explanation} />}
          {showSolution && files.data ? (
            <div className="card p-4">
              <div className="mb-2 text-sm font-semibold">📗 Reference tests</div>
              <CodeBlock code={files.data.solution} />
              <p className="mt-2 text-xs text-muted">Your tests can look different and still be correct: what matters is that they pass on the correct page and catch the bugs.</p>
            </div>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={revealSolution}>
              👀 Show reference tests {failed < REVEAL_AFTER_FAILS && !solved && <span className="text-faint">(after 3 attempts)</span>}
            </button>
          )}
          <Collapsible title="🧪 How this task is checked">
            <p className="text-sm text-muted">
              Your file runs in the <b className="text-fg">real Playwright</b> (Chromium, headless) against the Bug Playground page. <b className="text-fg">▶ Run</b> uses
              only the correct version of the page. <b className="text-fg">✓ Check</b> also runs your tests on {task.mutants.length || 'no'} broken version
              {task.mutants.length === 1 ? '' : 's'} of the page, each with one bug turned on. Good tests are green on the correct page and red on every broken one.
            </p>
            <p className="mt-2 text-sm text-muted">
              Page URLs are relative: <code className="font-mono">await page.goto(&apos;/playground/login&apos;)</code> (baseURL is the app itself).
            </p>
          </Collapsible>
        </div>
      </section>

      <section className="flex min-h-[640px] flex-col lg:min-h-0">
        <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2">
          <span className="font-mono text-xs text-muted">{SPEC_FILE}</span>
          <div className="flex-1" />
          <button className="btn btn-ghost btn-sm" onClick={reset} disabled={!files.data || busy !== null}>
            ↺ Reset
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => void execute('run')} disabled={!files.data || busy !== null} title="Run on the correct page only">
            {busy === 'run' ? 'Running…' : '▶ Run'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => void execute('check')} disabled={!files.data || busy !== null} title="Ctrl+Enter">
            {busy === 'check' ? 'Checking…' : '✓ Check'}
          </button>
        </div>
        <div className="min-h-[280px] flex-1">
          {files.data ? (
            <Editor
              key={ct.id}
              path={`file:///${ct.id}/${SPEC_FILE}`}
              defaultLanguage="typescript"
              defaultValue={initialCode}
              theme={theme === 'dark' ? 'qa-dark' : 'qa-light'}
              onChange={onChange}
              onMount={onMount}
              loading={<div className="p-4 text-sm text-muted">Loading editor…</div>}
              options={EDITOR_OPTIONS}
            />
          ) : (
            <div className="p-4 text-sm text-muted">Loading task…</div>
          )}
        </div>
        <div className="flex h-[42%] min-h-[220px] flex-col border-t border-line bg-surface">
          <div className="border-b border-line px-3 py-1.5 text-xs font-semibold text-muted">Playwright results</div>
          <div className="scroll-thin flex-1 overflow-y-auto p-3">
            <ResultsPanel task={task} busy={busy} outcome={outcome} onSimilar={onSimilar} next={next} />
          </div>
        </div>
      </section>
    </div>
  );
}

function SetupCallout({ status, onRecheck }: { status: LabStatus; onRecheck: () => void }) {
  return (
    <Callout tone="warn" title="One-time setup: install the Playwright browser">
      <p className="text-sm">{status.message}</p>
      <p className="mt-2 text-sm">
        Open a terminal <b>outside</b> this app (Windows Terminal, cmd or the VS Code terminal) in the project folder and run:
      </p>
      <CodeBlock code="npm run lab:setup" />
      <button className="btn btn-secondary btn-sm mt-2" onClick={onRecheck}>
        ↻ Check again
      </button>
    </Callout>
  );
}

function ResultsPanel({
  task,
  busy,
  outcome,
  onSimilar,
  next,
}: {
  task: PlaywrightTask;
  busy: null | 'run' | 'check';
  outcome: Outcome | null;
  onSimilar?: () => void;
  next?: { to: string; label: string };
}) {
  if (busy === 'run') return <div className="text-sm text-muted">⏳ Playwright is running your tests in Chromium on the correct page…</div>;
  if (busy === 'check') {
    return (
      <div className="text-sm text-muted">
        ⏳ Playwright is running your tests in Chromium on the correct page and on {task.mutants.length} broken version{task.mutants.length === 1 ? '' : 's'} of it…
        (usually 5–30 seconds)
      </div>
    );
  }
  if (!outcome) {
    return (
      <div className="text-sm text-muted">
        Write your tests, then press <b className="text-fg">▶ Run</b> to try them on the correct page, or <b className="text-fg">✓ Check</b> (Ctrl+Enter) to grade them:
        green on the correct page and red on every page version with a bug.
      </div>
    );
  }
  const { run, grade, kind } = outcome;
  if (!run.ok) {
    return (
      <Callout tone={run.reason === 'busy' ? 'warn' : 'bad'} title={run.reason === 'setup' ? 'Playwright browser is not installed' : 'The run did not complete'}>
        <pre className="whitespace-pre-wrap font-mono text-[13px]">{run.message}</pre>
        {run.reason === 'setup' && <CodeBlock code="npm run lab:setup" />}
      </Callout>
    );
  }
  if (!grade) return null;
  return (
    <div className="space-y-3">
      <Summary task={task} grade={grade} kind={kind} durationMs={run.durationMs} />
      {grade.errors.length > 0 && (
        <Callout tone="bad" title="Playwright could not run your file">
          {grade.errors.map((e) => (
            <pre key={e} className="mt-1 whitespace-pre-wrap font-mono text-[13px]">
              {e}
            </pre>
          ))}
        </Callout>
      )}
      {kind === 'check' && grade.ruleFailures.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-bad">Task requirements</div>
          <ul className="mt-1 space-y-1">
            {grade.ruleFailures.map((m) => (
              <li key={m} className="rounded-lg bg-sunken px-3 py-2 text-sm">
                ✗ <Markdown compact className="inline [&_p]:inline">{m}</Markdown>
              </li>
            ))}
          </ul>
        </div>
      )}
      {kind === 'check' && grade.tooFewTests && task.minTests !== undefined && (
        <Callout tone="bad" title={`Write at least ${task.minTests} tests`}>
          One test() per behaviour from the task.
        </Callout>
      )}
      <TestList tests={grade.correct} />
      {kind === 'check' && grade.greenOnCorrect && grade.mutants.length > 0 && <MutantList grade={grade} />}
      {kind === 'check' && <NextActions passed={grade.passed} onSimilar={onSimilar} next={next} />}
    </div>
  );
}

function Summary({ task, grade, kind, durationMs }: { task: PlaywrightTask; grade: PlaywrightGrade; kind: 'run' | 'check'; durationMs: number }) {
  const caughtCount = grade.mutants.filter((m) => m.caught).length;
  if (kind === 'run') {
    return (
      <Callout tone={grade.greenOnCorrect ? 'ok' : 'bad'} title={grade.greenOnCorrect ? 'Green on the correct page' : 'Not green on the correct page yet'}>
        {grade.greenOnCorrect
          ? `All ${grade.correct.length} tests passed in ${seconds(durationMs)}. Press Check to see whether they also catch the bugs.`
          : 'A test that fails on the correct page has a wrong step or expectation. Read the Playwright message below.'}
      </Callout>
    );
  }
  if (grade.passed) {
    return (
      <Callout tone="ok" title="Great tests! 🎉">
        Green on the correct page{brokenVersionsText(task.mutants.length)}.
      </Callout>
    );
  }
  return (
    <Callout tone="bad" title="Not passed yet">
      {grade.greenOnCorrect
        ? `Your tests pass on the correct page and catch ${caughtCount} of ${grade.mutants.length} bugs.`
        : 'First make every test pass on the correct page: a test that fails there has a wrong step or expectation.'}
    </Callout>
  );
}

function TestList({ tests }: { tests: LabTestResult[] }) {
  if (tests.length === 0) return null;
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-faint">Your tests on the correct page</div>
      <ul className="space-y-1.5">
        {tests.map((t) => (
          <li key={t.title} className={`rounded-lg px-3 py-2 text-sm ${t.status === 'passed' ? 'bg-ok-soft' : 'bg-bad-soft'}`}>
            <div className="flex gap-2">
              <span className={t.status === 'passed' ? 'text-ok' : 'text-bad'}>{STATUS_ICON[t.status]}</span>
              <span className="min-w-0 flex-1">{t.title}</span>
              <span className="text-xs text-faint">{seconds(t.durationMs)}</span>
            </div>
            {t.error && <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap pl-5 font-mono text-[13px] text-fg/90">{t.error}</pre>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MutantList({ grade }: { grade: PlaywrightGrade }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-faint">
        Bugs caught: {grade.mutants.filter((m) => m.caught).length} of {grade.mutants.length}
      </div>
      <ul className="space-y-1.5">
        {grade.mutants.map((m) => (
          <li key={m.id} className={`rounded-lg px-3 py-2 text-sm ${m.caught ? 'bg-ok-soft' : 'bg-warn-soft'}`}>
            <span className={m.caught ? 'text-ok' : 'text-warn'}>{m.caught ? '🎯 Caught: ' : '🐛 Not caught yet: '}</span>
            <Markdown compact className="inline [&_p]:inline">
              {m.caught ? m.description : m.hint}
            </Markdown>
          </li>
        ))}
      </ul>
    </div>
  );
}
