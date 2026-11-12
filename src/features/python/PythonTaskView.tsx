import { useEffect, useMemo, useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { monaco } from '../../monaco/setup';
import type { PythonTask } from '../../content/schema';
import { loadPythonTaskCode } from '../../content/loader';
import { useProgress, useSettings } from '../progress/store';
import {
  checkPythonSolution,
  checkPythonTests,
  runPythonProgram,
  warmUpPython,
  type PythonCheckResult,
  type PythonSuiteResult,
} from '../../runner/python-client';
import type { PythonRunResult, PythonTestCase } from '../../runner/python-protocol';
import { CodeBlock, Markdown } from '../../components/Markdown';
import { Callout } from '../../components/ui';
import { useAsync } from '../../lib/useAsync';
import { Collapsible, ExplanationPanel, HintsPanel, NextActions } from '../tasks/shared';
import type { TaskViewProps } from '../tasks/types';

type EditorInstance = Parameters<OnMount>[0];
type Panel = 'results' | 'console';
type NextTarget = TaskViewProps['next'];

const DRAFT_SAVE_DELAY_MS = 400;
const ATTEMPTS_BEFORE_SOLUTION = 3;
const EDITOR_FONT_SIZE = 14;
const PYTHON_TAB_SIZE = 4;
const EDITOR_PADDING_TOP = 12;
const SUBJECT_FILE = 'subject.py';

interface ConsoleOutput {
  source: 'run' | 'check';
  run: PythonRunResult;
}

/** Python code task (python-client.ts runs it in a Pyodide worker). */
export default function PythonTaskView({ ct, header, onSimilar, next }: TaskViewProps) {
  const task = ct.task as PythonTask;
  const files = useAsync(() => loadPythonTaskCode(ct.id), [ct.id]);
  const theme = useSettings((s) => s.theme);
  const progress = useProgress((s) => s.tasks[ct.id]);
  const recordAttempt = useProgress((s) => s.recordAttempt);
  const saveDraft = useProgress((s) => s.saveDraft);
  const markSolutionViewed = useProgress((s) => s.markSolutionViewed);

  const testsMode = task.mode === 'tests';
  const fileName = testsMode ? 'tests.py' : 'solution.py';
  const codeRef = useRef('');
  const editorRef = useRef<EditorInstance | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const [busy, setBusy] = useState<null | 'check' | 'run'>(null);
  const [result, setResult] = useState<PythonCheckResult | null>(null);
  const [suite, setSuite] = useState<PythonSuiteResult | null>(null);
  const [consoleOut, setConsoleOut] = useState<ConsoleOutput | null>(null);
  const [panel, setPanel] = useState<Panel>('results');
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => warmUpPython(), []);

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

  const doCheck = async () => {
    if (!files.data || busy) return;
    setBusy('check');
    setPanel('results');
    saveDraft(ct.id, codeRef.current);
    if (testsMode) {
      const r = await checkPythonTests(codeRef.current, files.data.support, files.data.mutants, task.mutants, task.minTests, task.codeRules);
      setSuite(r);
      setConsoleOut({ source: 'check', run: r });
      recordAttempt(ct.id, r.passed);
    } else {
      const r = await checkPythonSolution(codeRef.current, files.data.tests, files.data.support, task.codeRules);
      setResult(r);
      setConsoleOut({ source: 'check', run: r });
      recordAttempt(ct.id, r.passed);
    }
    setBusy(null);
  };

  const doRun = async () => {
    if (busy) return;
    setBusy('run');
    setPanel('console');
    const run = await runPythonProgram(codeRef.current, files.data?.support ?? {});
    setConsoleOut({ source: 'run', run });
    setBusy(null);
  };

  const checkRef = useRef(doCheck);
  checkRef.current = doCheck;

  const onMount: OnMount = (editor) => {
    editorRef.current = editor;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => void checkRef.current());
  };

  const reset = () => {
    if (!files.data) return;
    if (!confirm('Reset the editor to the starting code? Your current code will be lost.')) return;
    editorRef.current?.setValue(files.data.starter);
    setResult(null);
    setSuite(null);
  };

  const failed = progress?.failedAttempts ?? 0;
  const solved = progress?.status === 'solved';

  const revealSolution = () => {
    const early = !solved && failed < ATTEMPTS_BEFORE_SOLUTION;
    if (early && !confirm('Try at least 3 times before looking at the solution — struggling a bit is how you learn. Show it anyway?')) return;
    markSolutionViewed(ct.id);
    setShowSolution(true);
  };

  if (files.error) return <div className="p-8 text-bad">Could not load the task files: {files.error}</div>;

  return (
    <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(340px,2fr)_3fr]">
      <section className="scroll-thin min-h-0 overflow-y-auto border-line p-5 lg:border-r lg:p-6">
        {header}
        <Markdown compact>{task.statement}</Markdown>
        {files.data && <SupportFiles files={files.data.support} testsMode={testsMode} />}
        <div className="mt-5 space-y-3">
          <HintsPanel taskId={ct.id} hints={task.hints} />
          {task.explanation && (failed > 0 || solved) && <ExplanationPanel text={task.explanation} />}
          {showSolution && files.data ? (
            <div className="card p-4">
              <div className="mb-2 text-sm font-bold">📗 {testsMode ? 'Reference tests' : "Author's solution"}</div>
              <CodeBlock code={files.data.solution} lang="python" />
              <p className="mt-2 text-xs text-muted">Your solution can be different and still correct — what matters is that the checks pass.</p>
            </div>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={revealSolution}>
              👀 Show solution {failed < ATTEMPTS_BEFORE_SOLUTION && !solved && <span className="text-faint">(after 3 attempts)</span>}
            </button>
          )}
        </div>
      </section>

      <section className="flex min-h-[640px] flex-col lg:min-h-0">
        <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2">
          <span className="font-mono text-xs text-muted">🐍 {fileName}</span>
          <div className="flex-1" />
          <button className="btn btn-ghost btn-sm" onClick={reset} disabled={!files.data}>
            ↺ Reset
          </button>
          {!testsMode && (
            <button className="btn btn-secondary btn-sm" onClick={doRun} disabled={!files.data || busy !== null} title="Run your file and see print() output">
              ▶ Run
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={doCheck} disabled={!files.data || busy !== null} title="Ctrl+Enter">
            {busy === 'check' ? 'Checking…' : '✓ Check'}
          </button>
        </div>
        <div className="min-h-[280px] flex-1">
          {files.data ? (
            <Editor
              key={ct.id}
              path={`file:///${ct.id}/${fileName}`}
              defaultLanguage="python"
              defaultValue={initialCode}
              theme={theme === 'dark' ? 'qa-dark' : 'qa-light'}
              onChange={onChange}
              onMount={onMount}
              loading={<div className="p-4 text-sm text-muted">Loading editor…</div>}
              options={{
                minimap: { enabled: false },
                fontSize: EDITOR_FONT_SIZE,
                fontFamily: '"JetBrains Mono Variable", "JetBrains Mono", "Cascadia Code", Consolas, monospace',
                scrollBeyondLastLine: false,
                tabSize: PYTHON_TAB_SIZE,
                insertSpaces: true,
                automaticLayout: true,
                padding: { top: EDITOR_PADDING_TOP },
                renderLineHighlight: 'line',
              }}
            />
          ) : (
            <div className="p-4 text-sm text-muted">Loading task…</div>
          )}
        </div>
        <div className="flex h-[40%] min-h-[200px] flex-col border-t border-line bg-surface">
          <div className="flex gap-1 border-b border-line px-2">
            {(['results', 'console'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPanel(p)}
                className={`-mb-px border-b-2 px-3 py-1.5 text-xs font-bold capitalize ${panel === p ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg'}`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="scroll-thin flex-1 overflow-y-auto p-3">
            <PanelContent
              panel={panel}
              testsMode={testsMode}
              busy={busy}
              result={result}
              suite={suite}
              consoleOut={consoleOut}
              totalMutants={task.mutants.length}
              minTests={task.minTests}
              onSimilar={onSimilar}
              next={next}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

interface PanelProps {
  panel: Panel;
  testsMode: boolean;
  busy: null | 'check' | 'run';
  result: PythonCheckResult | null;
  suite: PythonSuiteResult | null;
  consoleOut: ConsoleOutput | null;
  totalMutants: number;
  minTests?: number;
  onSimilar?: () => void;
  next: NextTarget;
}

function PanelContent(props: PanelProps) {
  if (props.panel === 'console') return <ConsoleView out={props.consoleOut} busy={props.busy === 'run'} />;
  if (props.testsMode) {
    return <SuiteView result={props.suite} busy={props.busy === 'check'} total={props.totalMutants} minTests={props.minTests} onSimilar={props.onSimilar} next={props.next} />;
  }
  return <ResultsView result={props.result} busy={props.busy === 'check'} onSimilar={props.onSimilar} next={props.next} />;
}

function RunProblems({ run, label }: { run: PythonRunResult; label: string }) {
  return (
    <>
      {run.timedOut && (
        <Callout tone="bad" title="⏱ Time limit exceeded">
          The code ran for more than 5 seconds — most likely an infinite loop. Check that every <code className="font-mono">while</code> condition eventually
          becomes False.
        </Callout>
      )}
      {run.error && (
        <Callout tone="bad" title={`💥 ${label}`}>
          <pre className="whitespace-pre-wrap font-mono text-[13px]">{run.error}</pre>
        </Callout>
      )}
    </>
  );
}

function RuleFailures({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="text-sm font-bold text-bad">Task requirements</div>
      <ul className="mt-1 space-y-1">
        {items.map((m) => (
          <li key={m} className="rounded-lg bg-sunken px-3 py-2 text-sm">
            ✗ {m}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TestList({ tests, wrongExpectation }: { tests: PythonTestCase[]; wrongExpectation?: boolean }) {
  return (
    <ul className="space-y-1.5">
      {tests.map((t) => (
        <li key={t.name} className={`rounded-lg px-3 py-2 text-sm ${t.passed ? 'bg-ok-soft' : 'bg-bad-soft'}`}>
          <div className="flex gap-2">
            <span className={t.passed ? 'text-ok' : 'text-bad'}>{t.passed ? '✓' : '✗'}</span>
            <span className="min-w-0 flex-1 font-mono text-[13px]">{t.name}</span>
          </div>
          {!t.passed && t.error && <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap pl-5 font-mono text-[13px] text-fg/90">{t.error}</pre>}
          {!t.passed && t.hint && !wrongExpectation && <div className="mt-1 pl-5 text-xs text-muted">💡 {t.hint}</div>}
          {!t.passed && wrongExpectation && (
            <div className="mt-1 pl-5 text-xs text-muted">💡 This test fails on the CORRECT code, so its expectation is wrong. Re-read the code under test.</div>
          )}
        </li>
      ))}
    </ul>
  );
}

function ResultsView({ result, busy, onSimilar, next }: { result: PythonCheckResult | null; busy: boolean; onSimilar?: () => void; next: NextTarget }) {
  if (busy) return <div className="text-sm text-muted">⏳ Running your Python code and the tests… (the very first check loads Python, a few seconds)</div>;
  if (!result) {
    return (
      <div className="text-sm text-muted">
        Press <b className="text-fg">Check</b> (Ctrl+Enter) to run the hidden tests on your code. Press <b className="text-fg">Run</b> to execute your file and see{' '}
        <code className="font-mono">print()</code> output.
      </div>
    );
  }
  const passedCount = result.tests.filter((t) => t.passed).length;
  const summary = result.tests.length > 0 ? `${passedCount} of ${result.tests.length} tests passed. Each failed test shows what was expected.` : 'Fix the problem below and check again.';
  return (
    <div className="space-y-3">
      {result.passed ? (
        <Callout tone="ok" title="All checks passed! 🎉">
          All {result.tests.length} tests are green.
        </Callout>
      ) : (
        <Callout tone="bad" title="Not passed yet">
          {summary}
        </Callout>
      )}
      <RunProblems run={result} label="Your code could not be loaded" />
      <RuleFailures items={result.ruleFailures} />
      {result.tests.length > 0 && <TestList tests={result.tests} />}
      <NextActions passed={result.passed} onSimilar={onSimilar} next={next} />
    </div>
  );
}

function SuiteView({
  result,
  busy,
  total,
  minTests,
  onSimilar,
  next,
}: {
  result: PythonSuiteResult | null;
  busy: boolean;
  total: number;
  minTests?: number;
  onSimilar?: () => void;
  next: NextTarget;
}) {
  if (busy) return <div className="text-sm text-muted">⏳ Running your tests on the real code and on {total} broken versions of it…</div>;
  if (!result) {
    return (
      <div className="text-sm text-muted">
        Here <b className="text-fg">you</b> write the tests. <b className="text-fg">Check</b> runs them on the real code (they must all pass) and then on {total}{' '}
        deliberately broken versions — <i>mutants</i>. Good tests fail on every mutant: that means they would catch the bug.
      </div>
    );
  }
  const killed = result.mutants.filter((m) => m.killed).length;
  const green = !result.error && !result.timedOut && result.tests.length > 0 && result.tests.every((t) => t.passed);
  const summary = green
    ? `Your tests pass on the real code and catch ${killed} of ${total} bugs. Add tests for the cases that are still missing.`
    : 'First make every test pass on the real code: a test that fails on correct code has a wrong expectation.';
  return (
    <div className="space-y-3">
      {result.passed ? (
        <Callout tone="ok" title="Great tests! 🎉">
          All {result.tests.length} tests pass on the real code and catch all {total} bugs.
        </Callout>
      ) : (
        <Callout tone="bad" title="Not passed yet">
          {summary}
        </Callout>
      )}
      <RunProblems run={result} label="Your test file could not be loaded" />
      <RuleFailures items={result.ruleFailures} />
      {result.tooFewTests && minTests !== undefined && (
        <Callout tone="bad" title={`Write at least ${minTests} tests`}>
          One test_ function per behaviour: valid values, boundaries, invalid input…
        </Callout>
      )}
      {result.tests.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-bold uppercase tracking-wide text-faint">Your tests on the real code</div>
          <TestList tests={result.tests} wrongExpectation />
        </div>
      )}
      {result.mutants.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-bold uppercase tracking-wide text-faint">
            🐛 Bugs caught: {killed} of {total}
          </div>
          <ul className="space-y-1.5">
            {result.mutants.map((m) => (
              <li key={m.id} className={`rounded-lg px-3 py-2 text-sm ${m.killed ? 'bg-ok-soft' : 'bg-bad-soft'}`}>
                {m.killed ? (
                  <span>
                    <span className="text-ok">✓ Caught:</span> {m.description}
                  </span>
                ) : (
                  <span>
                    <span className="text-bad">✗ A broken version survived.</span> 💡 {m.hint}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <NextActions passed={result.passed} onSimilar={onSimilar} next={next} />
    </div>
  );
}

function ConsoleView({ out, busy }: { out: ConsoleOutput | null; busy: boolean }) {
  if (busy) return <div className="text-sm text-muted">⏳ Running… (the first run loads Python, a few seconds)</div>;
  if (!out) return <div className="text-sm text-muted">Output of print() from Run / Check appears here.</div>;
  const empty = out.run.stdout === '' && !out.run.error && !out.run.timedOut;
  return (
    <div className="space-y-2 font-mono text-[13px]">
      {empty && <div className="text-muted">(no output{out.source === 'run' ? ' — add print(...) to your file to see something' : ''})</div>}
      {out.run.stdout && <pre className="whitespace-pre-wrap">{out.run.stdout}</pre>}
      {out.run.error && <pre className="whitespace-pre-wrap text-bad">💥 {out.run.error}</pre>}
      {out.run.timedOut && <div className="text-bad">⏱ Stopped after 5 seconds (infinite loop?)</div>}
    </div>
  );
}

function SupportFiles({ files, testsMode }: { files: Record<string, string>; testsMode: boolean }) {
  const entries = Object.entries(files);
  if (entries.length === 0) return null;
  return (
    <div className="mt-4 space-y-2">
      {entries.map(([name, code]) => {
        const isSubject = testsMode && name === SUBJECT_FILE;
        return (
          <Collapsible
            key={name}
            defaultOpen={isSubject}
            title={
              <span>
                📄 <span className="font-mono">{name}</span>{' '}
                <span className="font-normal text-muted">{isSubject ? '— the code you are testing (read-only)' : '— project file (read-only)'}</span>
              </span>
            }
          >
            <CodeBlock code={code} lang="python" />
          </Collapsible>
        );
      })}
    </div>
  );
}
