import { useEffect, useMemo, useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { monaco } from '../../monaco/setup';
import type { CodeTask } from '../../content/schema';
import { loadTaskCode } from '../../content/loader';
import { useProgress, useSettings } from '../progress/store';
import {
  checkCode,
  checkTests,
  runCode,
  warmUpCompiler,
  type CheckResult,
  type CompileDiagnostic,
  type LogEntry,
  type SuiteResult,
} from '../../runner/client';
import { TS_TIPS } from '../../runner/ts-tips';
import { CodeBlock, Markdown } from '../../components/Markdown';
import { Callout } from '../../components/ui';
import { useAsync } from '../../lib/useAsync';
import { Collapsible, ExplanationPanel, HintsPanel, NextActions } from './shared';
import type { TaskViewProps } from './types';

type EditorInstance = Parameters<OnMount>[0];

interface ConsoleOutput {
  source: 'run' | 'check';
  logs: LogEntry[];
  codeErrors: CompileDiagnostic[];
  runtimeError?: string;
  timedOut?: boolean;
}

export default function CodeTaskView({ ct, header, onSimilar, next }: TaskViewProps) {
  const task = ct.task as CodeTask;
  const files = useAsync(() => loadTaskCode(ct.id), [ct.id]);
  const theme = useSettings((s) => s.theme);
  const progress = useProgress((s) => s.tasks[ct.id]);
  const recordAttempt = useProgress((s) => s.recordAttempt);
  const saveDraft = useProgress((s) => s.saveDraft);
  const markSolutionViewed = useProgress((s) => s.markSolutionViewed);

  const codeRef = useRef('');
  const editorRef = useRef<EditorInstance | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const [busy, setBusy] = useState<null | 'check' | 'run'>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [suite, setSuite] = useState<(SuiteResult & { fatal?: string; ruleFailures: string[] }) | null>(null);
  const testsMode = task.mode === 'tests';
  const fileName = testsMode ? 'tests.ts' : 'solution.ts';
  const [consoleOut, setConsoleOut] = useState<ConsoleOutput | null>(null);
  const [panel, setPanel] = useState<'results' | 'console'>('results');
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => warmUpCompiler(), []);

  // Support files become Monaco models next to the editor file, so `import … from './subject'` resolves in the editor.
  useEffect(() => {
    if (!files.data) return undefined;
    const models = Object.entries(files.data.support).map(([name, code]) => {
      const uri = monaco.Uri.parse(`file:///${ct.id}/${name}`);
      return monaco.editor.getModel(uri) ?? monaco.editor.createModel(code, 'typescript', uri);
    });
    return () => models.forEach((m) => m.dispose());
  }, [files.data, ct.id]);

  const initialCode = useMemo(() => {
    if (!files.data) return '';
    const d = useProgress.getState().drafts[ct.id];
    return typeof d === 'string' ? d : files.data.starter;
  }, [files.data, ct.id]);

  useEffect(() => {
    codeRef.current = initialCode;
  }, [initialCode]);

  const onChange = (v?: string) => {
    codeRef.current = v ?? '';
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveDraft(ct.id, codeRef.current), 400);
  };

  const doCheck = async () => {
    if (!files.data || busy) return;
    setBusy('check');
    setPanel('results');
    saveDraft(ct.id, codeRef.current);
    if (testsMode) {
      const r = await checkTests(codeRef.current, files.data.support, files.data.mutants, task.mutants, task.minTests, task.codeRules);
      setSuite(r);
      setConsoleOut({ source: 'check', logs: r.logs, codeErrors: [], runtimeError: r.runtimeError, timedOut: r.timedOut });
      setBusy(null);
      recordAttempt(ct.id, r.passed);
      return;
    }
    const r = await checkCode(codeRef.current, files.data.tests, task.codeRules, files.data.support);
    setResult(r);
    setConsoleOut({ source: 'check', logs: r.logs, codeErrors: [], runtimeError: r.runtimeError, timedOut: r.timedOut });
    setBusy(null);
    recordAttempt(ct.id, r.passed);
  };

  const doRun = async () => {
    if (busy) return;
    setBusy('run');
    setPanel('console');
    const r = await runCode(codeRef.current, files.data?.support ?? {});
    setConsoleOut({ source: 'run', logs: r.logs, codeErrors: r.codeErrors, runtimeError: r.runtimeError ?? r.fatal, timedOut: r.timedOut });
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
    if (!solved && failed < 3 && !confirm('Try at least 3 times before looking at the solution — struggling a bit is how you learn. Show it anyway?')) return;
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
              <div className="mb-2 text-sm font-semibold">📗 {testsMode ? 'Reference tests' : <>Author&apos;s solution</>}</div>
              <CodeBlock code={files.data.solution} />
              <p className="mt-2 text-xs text-muted">Your solution can be different and still correct — what matters is that the checks pass.</p>
            </div>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={revealSolution}>
              👀 Show solution {failed < 3 && !solved && <span className="text-faint">(after 3 attempts)</span>}
            </button>
          )}
        </div>
      </section>

      <section className="flex min-h-[640px] flex-col lg:min-h-0">
        <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2">
          <span className="font-mono text-xs text-muted">{fileName}</span>
          <div className="flex-1" />
          <button className="btn btn-ghost btn-sm" onClick={reset} disabled={!files.data}>
            ↺ Reset
          </button>
          {!testsMode && (
            <button className="btn btn-secondary btn-sm" onClick={doRun} disabled={!files.data || busy !== null} title="Run your file and see console.log output">
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
              defaultLanguage="typescript"
              defaultValue={initialCode}
              theme={theme === 'dark' ? 'qa-dark' : 'qa-light'}
              onChange={onChange}
              onMount={onMount}
              loading={<div className="p-4 text-sm text-muted">Loading editor…</div>}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
                scrollBeyondLastLine: false,
                tabSize: 2,
                automaticLayout: true,
                padding: { top: 12 },
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
                className={`-mb-px border-b-2 px-3 py-1.5 text-xs font-semibold capitalize ${panel === p ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg'}`}
              >
                {p}
                {p === 'console' && consoleOut && consoleOut.logs.length > 0 && <span className="ml-1 text-faint">({consoleOut.logs.length})</span>}
              </button>
            ))}
          </div>
          <div className="scroll-thin flex-1 overflow-y-auto p-3">
            {panel === 'results' ? (
              testsMode ? (
                <SuiteView result={suite} busy={busy === 'check'} minTests={task.minTests} total={task.mutants.length} onSimilar={onSimilar} next={next} />
              ) : (
                <ResultsView result={result} busy={busy === 'check'} onSimilar={onSimilar} next={next} />
              )
            ) : (
              <ConsoleView out={consoleOut} busy={busy === 'run'} />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function DiagnosticList({ items }: { items: CompileDiagnostic[] }) {
  return (
    <ul className="mt-2 space-y-2">
      {items.map((d, i) => (
        <li key={i} className="rounded-lg bg-sunken px-3 py-2 text-sm">
          <div className="font-mono text-xs text-bad">
            {d.line > 0 && `Line ${d.line}:${d.column} · `}TS{d.code}
          </div>
          <div className="mt-0.5 whitespace-pre-wrap font-mono text-[13px]">{d.message}</div>
          {TS_TIPS[d.code] && <div className="mt-1 text-xs text-muted">💡 {TS_TIPS[d.code]}</div>}
        </li>
      ))}
    </ul>
  );
}

function ResultsView({
  result,
  busy,
  onSimilar,
  next,
}: {
  result: CheckResult | null;
  busy: boolean;
  onSimilar?: () => void;
  next?: { to: string; label: string };
}) {
  if (busy) return <div className="text-sm text-muted">⏳ Compiling with TypeScript and running the tests… (the first check takes a few seconds)</div>;
  if (!result) {
    return (
      <div className="text-sm text-muted">
        Press <b className="text-fg">Check</b> (Ctrl+Enter) to type-check your code with the real TypeScript compiler and run the hidden tests.
        Press <b className="text-fg">Run</b> to just execute your file and see <code className="font-mono">console.log</code> output.
      </div>
    );
  }
  const passedCount = result.results.filter((r) => r.passed).length;
  return (
    <div className="space-y-3">
      {result.passed ? (
        <Callout tone="ok" title="All checks passed! 🎉">
          TypeScript found no errors and all {result.results.length} tests are green.
        </Callout>
      ) : (
        <Callout tone="bad" title="Not passed yet">
          {result.results.length > 0
            ? `${passedCount} of ${result.results.length} tests passed. Read the messages below — each failed test explains what is expected.`
            : 'Fix the problems below and check again.'}
        </Callout>
      )}

      {result.fatal && <Callout tone="bad" title="Compiler crashed">{result.fatal}</Callout>}
      {result.timedOut && (
        <Callout tone="bad" title="⏱ Time limit exceeded">
          Your code ran for more than 5 seconds — most likely an infinite loop. Check that every loop condition eventually becomes false.
        </Callout>
      )}
      {result.runtimeError && (
        <Callout tone="bad" title="💥 Your code crashed while loading">
          <code className="font-mono">{result.runtimeError}</code>
        </Callout>
      )}

      {result.codeErrors.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-bad">TypeScript errors in your code ({result.codeErrors.length})</div>
          <DiagnosticList items={result.codeErrors} />
        </div>
      )}
      {result.interfaceErrors.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-bad">Your code doesn&apos;t match what the task expects</div>
          <p className="text-xs text-muted">Check the function/variable name, the `export` keyword and parameter types against the task description.</p>
          <DiagnosticList items={result.interfaceErrors} />
        </div>
      )}
      {result.ruleFailures.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-bad">Task requirements</div>
          <ul className="mt-1 space-y-1">
            {result.ruleFailures.map((m) => (
              <li key={m} className="rounded-lg bg-sunken px-3 py-2 text-sm">
                ✗ {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.results.length > 0 && (
        <ul className="space-y-1.5">
          {result.results.map((r, i) => (
            <li key={i} className={`rounded-lg px-3 py-2 text-sm ${r.passed ? 'bg-ok-soft' : 'bg-bad-soft'}`}>
              <div className="flex gap-2">
                <span className={r.passed ? 'text-ok' : 'text-bad'}>{r.passed ? '✓' : '✗'}</span>
                <span className="min-w-0 flex-1">{r.name}</span>
              </div>
              {!r.passed && r.error && <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap pl-5 font-mono text-[13.5px] text-fg/90">{r.error}</pre>}
              {!r.passed && r.hint && <div className="mt-1 pl-5 text-xs text-muted">💡 {r.hint}</div>}
            </li>
          ))}
        </ul>
      )}

      <NextActions passed={result.passed} onSimilar={onSimilar} next={next} />
    </div>
  );
}

function ConsoleView({ out, busy }: { out: ConsoleOutput | null; busy: boolean }) {
  if (busy) return <div className="text-sm text-muted">⏳ Running…</div>;
  if (!out) return <div className="text-sm text-muted">Console output from Run / Check will appear here.</div>;
  return (
    <div className="space-y-2 font-mono text-[13px]">
      {out.codeErrors.length > 0 && (
        <div className="text-xs text-warn">⚠ TypeScript reported {out.codeErrors.length} error(s) — the code still ran, but fix them before checking.</div>
      )}
      {out.logs.length === 0 && !out.runtimeError && !out.timedOut && (
        <div className="text-muted">
          (no output{out.source === 'run' ? ' — add console.log(...) to your file to print something' : ''})
        </div>
      )}
      {out.logs.map((l, i) => (
        <div key={i} className={`whitespace-pre-wrap border-b border-line/60 pb-1 ${l.level === 'error' ? 'text-bad' : l.level === 'warn' ? 'text-warn' : ''}`}>
          {l.text}
        </div>
      ))}
      {out.runtimeError && <div className="text-bad">💥 {out.runtimeError}</div>}
      {out.timedOut && <div className="text-bad">⏱ Stopped after 5 seconds (infinite loop?)</div>}
    </div>
  );
}

function SupportFiles({ files, testsMode }: { files: Record<string, string>; testsMode: boolean }) {
  const entries = Object.entries(files);
  if (entries.length === 0) return null;
  return (
    <div className="mt-4 space-y-2">
      {entries.map(([name, code]) => (
        <Collapsible
          key={name}
          defaultOpen={testsMode && name === 'subject.ts'}
          title={
            <span>
              📄 <span className="font-mono">{name}</span>{' '}
              <span className="font-normal text-muted">{testsMode && name === 'subject.ts' ? '— the code you are testing (read-only)' : '— project file (read-only)'}</span>
            </span>
          }
        >
          <CodeBlock code={code} />
        </Collapsible>
      ))}
    </div>
  );
}

function SuiteView({
  result,
  busy,
  minTests,
  total,
  onSimilar,
  next,
}: {
  result: (SuiteResult & { fatal?: string; ruleFailures: string[] }) | null;
  busy: boolean;
  minTests?: number;
  total: number;
  onSimilar?: () => void;
  next?: { to: string; label: string };
}) {
  if (busy) return <div className="text-sm text-muted">⏳ Running your tests on the real code and on {total} broken versions of it…</div>;
  if (!result) {
    return (
      <div className="text-sm text-muted">
        Here <b className="text-fg">you</b> write the tests. <b className="text-fg">Check</b> runs them on the real code (they must all pass) and then on{' '}
        {total} deliberately broken versions — <i>mutants</i>. Good tests fail on every mutant: that means they would catch the bug.
      </div>
    );
  }
  const killed = result.mutants.filter((m) => m.killed).length;
  const greenOnSubject = result.results.length > 0 && result.results.every((r) => r.passed) && !result.runtimeError && !result.timedOut;
  return (
    <div className="space-y-3">
      {result.passed ? (
        <Callout tone="ok" title="Great tests! 🎉">
          All {result.results.length} tests pass on the real code and catch all {total} bugs.
        </Callout>
      ) : (
        <Callout tone="bad" title="Not passed yet">
          {greenOnSubject
            ? `Your tests pass on the real code and catch ${killed} of ${total} bugs. Add tests for the cases that are still missing.`
            : 'First make every test pass on the real code: a test that fails on correct code has a wrong expectation.'}
        </Callout>
      )}
      {result.fatal && <Callout tone="bad" title="Compiler crashed">{result.fatal}</Callout>}
      {result.timedOut && <Callout tone="bad" title="⏱ Time limit exceeded">The tests ran for more than 5 seconds.</Callout>}
      {result.runtimeError && (
        <Callout tone="bad" title="💥 Your test file crashed while loading">
          <code className="font-mono">{result.runtimeError}</code>
        </Callout>
      )}
      {result.codeErrors.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-bad">TypeScript errors in your tests ({result.codeErrors.length})</div>
          <DiagnosticList items={result.codeErrors} />
        </div>
      )}
      {result.ruleFailures.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-bad">Task requirements</div>
          <ul className="mt-1 space-y-1">
            {result.ruleFailures.map((m) => (
              <li key={m} className="rounded-lg bg-sunken px-3 py-2 text-sm">
                ✗ {m}
              </li>
            ))}
          </ul>
        </div>
      )}
      {result.tooFewTests && minTests !== undefined && (
        <Callout tone="bad" title={`Write at least ${minTests} tests`}>
          One it() per behaviour: valid values, boundaries, invalid input…
        </Callout>
      )}

      {result.results.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-faint">Your tests on the real code</div>
          <ul className="space-y-1.5">
            {result.results.map((r, i) => (
              <li key={i} className={`rounded-lg px-3 py-2 text-sm ${r.passed ? 'bg-ok-soft' : 'bg-bad-soft'}`}>
                <div className="flex gap-2">
                  <span className={r.passed ? 'text-ok' : 'text-bad'}>{r.passed ? '✓' : '✗'}</span>
                  <span className="min-w-0 flex-1">{r.name}</span>
                </div>
                {!r.passed && r.error && <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap pl-5 font-mono text-[13.5px] text-fg/90">{r.error}</pre>}
                {!r.passed && <div className="mt-1 pl-5 text-xs text-muted">💡 This test fails on the CORRECT code, so its expectation is wrong. Re-read the code under test.</div>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.mutants.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-faint">
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
