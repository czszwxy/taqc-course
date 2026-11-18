import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { CodeEditor, EditorModeToggle, type CodeEditorHandle, type EditorLanguage } from '../../components/CodeEditor';
import { WEB_FILES, type WebFile, type WebTask } from '../../content/schema';
import { loadWebTaskFiles, type WebTaskFiles } from '../../content/loader';
import { useProgress } from '../progress/store';
import { CodeBlock, Markdown } from '../../components/Markdown';
import { Callout } from '../../components/ui';
import { useAsync } from '../../lib/useAsync';
import { Collapsible, ExplanationPanel, HintsPanel, NextActions } from '../tasks/shared';
import { buildPage, linksStylesheet } from '../../runner/web-page';
import { checkWebTask, type WebCheckResult } from '../../runner/web';
import type { TestResult } from '../../runner/harness';
import type { TaskViewProps } from '../tasks/types';

type Panel = 'preview' | 'checks';
type Files = Partial<Record<WebFile, string>>;

const DRAFT_SAVE_DELAY_MS = 400;
/** The preview follows the code after a short pause in typing. */
const PREVIEW_DELAY_MS = 300;
const ATTEMPTS_BEFORE_SOLUTION = 3;
const WEB_TAB_SIZE = 2;

const LANGUAGE_OF: Record<WebFile, EditorLanguage> = { 'index.html': 'html', 'styles.css': 'css' };
const ICON_OF: Record<WebFile, string> = { 'index.html': '📄', 'styles.css': '🎨' };

/** A typical phone and tablet viewport width (CSS pixels). */
const PHONE_WIDTH = 375;
const TABLET_WIDTH = 768;

/** Preview widths: a phone, a tablet, or the whole panel. */
const PREVIEW_WIDTHS = [
  { id: 'phone', label: `📱 ${PHONE_WIDTH}`, width: PHONE_WIDTH },
  { id: 'tablet', label: `▭ ${TABLET_WIDTH}`, width: TABLET_WIDTH },
  { id: 'full', label: '🖥️ Full', width: null },
] as const;
type PreviewWidth = (typeof PREVIEW_WIDTHS)[number]['id'];

/** The learner's saved files, or null when the draft is missing or not in the web-task shape. */
function savedFiles(draft: unknown, starter: Files): Files | null {
  if (typeof draft !== 'object' || draft === null) return null;
  const record = draft as Record<string, unknown>;
  const names = Object.keys(starter) as WebFile[];
  if (!names.every((name) => typeof record[name] === 'string')) return null;
  return Object.fromEntries(names.map((name) => [name, record[name] as string]));
}

/** Web page task: the learner writes HTML / CSS, sees it rendered, and Check runs the hidden checks on the page. */
export default function WebTaskView({ ct, header, onSimilar, next }: TaskViewProps): ReactElement {
  const task = ct.task as WebTask;
  const files = useAsync(() => loadWebTaskFiles(ct.id), [ct.id]);
  const progress = useProgress((s) => s.tasks[ct.id]);
  const recordAttempt = useProgress((s) => s.recordAttempt);
  const saveDraft = useProgress((s) => s.saveDraft);
  const markSolutionViewed = useProgress((s) => s.markSolutionViewed);

  const learnerNames = useMemo(() => WEB_FILES.filter((name) => files.data?.starter[name] !== undefined), [files.data]);
  const [activeFile, setActiveFile] = useState<WebFile | null>(null);
  const current = activeFile ?? learnerNames[0] ?? 'index.html';
  const codeRef = useRef<Files>({});
  const editorRef = useRef<CodeEditorHandle | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const previewTimer = useRef<number | undefined>(undefined);
  const [previewFiles, setPreviewFiles] = useState<Files>({});
  const [panel, setPanel] = useState<Panel>('preview');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<WebCheckResult | null>(null);
  const [showSolution, setShowSolution] = useState(false);

  const initialFiles = useMemo((): Files => {
    if (!files.data) return {};
    return savedFiles(useProgress.getState().drafts[ct.id], files.data.starter) ?? files.data.starter;
  }, [files.data, ct.id]);

  useEffect(() => {
    codeRef.current = { ...initialFiles };
    setPreviewFiles({ ...initialFiles });
  }, [initialFiles]);

  const onChange = (value: string): void => {
    codeRef.current = { ...codeRef.current, [current]: value };
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveDraft(ct.id, codeRef.current), DRAFT_SAVE_DELAY_MS);
    window.clearTimeout(previewTimer.current);
    previewTimer.current = window.setTimeout(() => setPreviewFiles({ ...codeRef.current }), PREVIEW_DELAY_MS);
  };

  const doCheck = async (): Promise<void> => {
    if (!files.data || busy) return;
    setBusy(true);
    setPanel('checks');
    saveDraft(ct.id, codeRef.current);
    const r = await checkWebTask(codeRef.current, files.data.support, files.data.tests, task.viewport, task.codeRules);
    setResult(r);
    recordAttempt(ct.id, r.passed);
    setBusy(false);
  };

  const reset = (): void => {
    if (!files.data) return;
    if (!confirm('Reset every file to the starting code? Your current code will be lost.')) return;
    codeRef.current = { ...files.data.starter };
    editorRef.current?.setValue(files.data.starter[current] ?? '');
    setPreviewFiles({ ...files.data.starter });
    saveDraft(ct.id, codeRef.current);
    setResult(null);
  };

  const failed = progress?.failedAttempts ?? 0;
  const solved = progress?.status === 'solved';
  const revealSolution = (): void => {
    const early = !solved && failed < ATTEMPTS_BEFORE_SOLUTION;
    if (early && !confirm('Try at least 3 times before looking at the solution — struggling a bit is how you learn. Show it anyway?')) return;
    markSolutionViewed(ct.id);
    setShowSolution(true);
  };

  if (files.error) return <div className="p-8 text-bad">Could not load the task files: {files.error}</div>;
  const pageFiles: Files = { ...files.data?.support, ...previewFiles };

  return (
    <div className="grid grid-cols-1 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(340px,2fr)_3fr]">
      <section className="scroll-thin border-line p-5 lg:min-h-0 lg:overflow-y-auto lg:border-r lg:p-6">
        {header}
        <Markdown compact>{task.statement}</Markdown>
        {files.data && <SupportFiles files={files.data.support} />}
        <div className="mt-5 space-y-3">
          <HintsPanel taskId={ct.id} hints={task.hints} />
          {task.explanation && (failed > 0 || solved) && <ExplanationPanel text={task.explanation} />}
          {showSolution && files.data ? (
            <SolutionFiles data={files.data} />
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={revealSolution}>
              👀 Show solution {failed < ATTEMPTS_BEFORE_SOLUTION && !solved && <span className="text-faint">(after 3 attempts)</span>}
            </button>
          )}
        </div>
      </section>

      {/* On a phone the statement comes first and the page scrolls; the editor and the preview get most of the screen. */}
      <section className="flex h-[88dvh] min-h-[560px] flex-col border-t-2 border-line lg:h-auto lg:min-h-0 lg:border-t-0">
        <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2">
          <div className="flex min-w-0 gap-1" role="tablist" aria-label="Files">
            {learnerNames.map((name) => (
              <button
                key={name}
                role="tab"
                aria-selected={name === current}
                onClick={() => setActiveFile(name)}
                className={`truncate rounded-md px-2 py-1 font-mono text-xs ${name === current ? 'bg-hover font-bold text-fg' : 'text-muted hover:text-fg'}`}
              >
                {ICON_OF[name]} {name}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <EditorModeToggle />
          <button className="btn btn-ghost btn-sm" onClick={reset} disabled={!files.data} title="Reset to the starting code">
            ↺ <span className="hidden sm:inline">Reset</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => void doCheck()} disabled={!files.data || busy} title="Ctrl+Enter">
            {busy ? 'Checking…' : '✓ Check'}
          </button>
        </div>
        <div className="min-h-[220px] flex-1">
          {files.data ? (
            <CodeEditor
              key={`${ct.id}/${current}`}
              path={`file:///${ct.id}/${current}`}
              language={LANGUAGE_OF[current]}
              initialValue={codeRef.current[current] ?? initialFiles[current] ?? ''}
              tabSize={WEB_TAB_SIZE}
              onChange={onChange}
              onSubmit={() => void doCheck()}
              onReady={(handle) => {
                editorRef.current = handle;
              }}
            />
          ) : (
            <div className="p-4 text-sm text-muted">Loading task…</div>
          )}
        </div>
        <div className="flex h-[45%] min-h-[240px] flex-col border-t border-line bg-surface">
          <div className="flex gap-1 border-b border-line px-2">
            {(['preview', 'checks'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPanel(p)}
                className={`-mb-px border-b-2 px-3 py-1.5 text-xs font-bold capitalize ${panel === p ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg'}`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1">
            {panel === 'preview' ? (
              <PagePreview files={pageFiles} />
            ) : (
              <div className="scroll-thin h-full overflow-y-auto p-3">
                <ChecksView result={result} busy={busy} onSimilar={onSimilar} next={next} />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/** What happened in the preview that the learner should know about (links and forms stay inside it). */
const PREVIEW_NOTES = {
  link: 'Links do not open other pages in the preview (only #anchors on this page work).',
  submit: '✅ The form is valid — a real browser would send it now (the preview never sends forms).',
} as const;

/**
 * Live preview of the learner's page in a sandboxed iframe: no scripts; forms validate, but are not sent;
 * links to other pages do not navigate away.
 */
function PagePreview({ files }: { files: Files }): ReactElement {
  const [widthId, setWidthId] = useState<PreviewWidth>('full');
  const [note, setNote] = useState<string | null>(null);
  const page = useMemo(() => buildPage(files), [files]);
  const unlinkedCss = files['styles.css'] !== undefined && !linksStylesheet(files['index.html'] ?? '');
  const width = PREVIEW_WIDTHS.find((w) => w.id === widthId)?.width ?? null;

  const onLoad = (frame: HTMLIFrameElement): void => {
    const doc = frame.contentDocument;
    if (!doc) return;
    setNote(null);
    doc.addEventListener(
      'click',
      (event) => {
        const link = (event.target as Element | null)?.closest?.('a[href]');
        const href = link?.getAttribute('href') ?? '';
        if (!link || href.startsWith('#')) return;
        event.preventDefault();
        setNote(PREVIEW_NOTES.link);
      },
      true,
    );
    doc.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        setNote(PREVIEW_NOTES.submit);
      },
      true,
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 text-xs">
        {PREVIEW_WIDTHS.map((w) => (
          <button
            key={w.id}
            onClick={() => setWidthId(w.id)}
            aria-pressed={w.id === widthId}
            className={`rounded-md px-2 py-0.5 ${w.id === widthId ? 'bg-hover font-bold text-fg' : 'text-muted hover:text-fg'}`}
          >
            {w.label}
          </button>
        ))}
        {unlinkedCss && <span className="chip chip-warn">styles.css is not linked from index.html</span>}
        {note && <span className="min-w-0 text-muted [overflow-wrap:anywhere]">{note}</span>}
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-sunken">
        <iframe
          title="Preview of your page"
          sandbox="allow-same-origin allow-forms"
          srcDoc={page}
          onLoad={(e) => onLoad(e.currentTarget)}
          className="h-full border-0 bg-white"
          style={{ width: width === null ? '100%' : `${width}px` }}
        />
      </div>
    </div>
  );
}

function TestList({ tests }: { tests: TestResult[] }): ReactElement {
  return (
    <ul className="space-y-1.5">
      {tests.map((t) => (
        <li key={t.name} className={`rounded-lg px-3 py-2 text-sm ${t.passed ? 'bg-ok-soft' : 'bg-bad-soft'}`}>
          <div className="flex gap-2">
            <span className={t.passed ? 'text-ok' : 'text-bad'}>{t.passed ? '✓' : '✗'}</span>
            <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{t.name}</span>
          </div>
          {!t.passed && t.error && <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap pl-5 font-mono text-[13px] text-fg/90">{t.error}</pre>}
          {!t.passed && t.hint && <div className="mt-1 pl-5 text-xs text-muted">💡 {t.hint}</div>}
        </li>
      ))}
    </ul>
  );
}

interface ChecksViewProps {
  result: WebCheckResult | null;
  busy: boolean;
  onSimilar?: () => void;
  next: TaskViewProps['next'];
}

function ChecksView({ result, busy, onSimilar, next }: ChecksViewProps): ReactElement {
  if (busy) return <div className="text-sm text-muted">⏳ Checking your page…</div>;
  if (!result) {
    return (
      <div className="text-sm text-muted">
        Press <b className="text-fg">Check</b> (Ctrl+Enter) to run the hidden checks on your page. The <b className="text-fg">Preview</b> tab shows it as a
        browser draws it.
      </div>
    );
  }
  const passedCount = result.results.filter((t) => t.passed).length;
  return (
    <div className="space-y-3">
      {result.passed ? (
        <Callout tone="ok" title="All checks passed! 🎉">
          All {result.results.length} checks are green.
        </Callout>
      ) : (
        <Callout tone="bad" title="Not passed yet">
          {result.results.length > 0 ? `${passedCount} of ${result.results.length} checks passed. Each failed check says what is missing.` : 'Fix the problem below and check again.'}
        </Callout>
      )}
      {result.timedOut && <Callout tone="bad" title="⏱ The checks took too long">Check again; if it repeats, reload the page.</Callout>}
      {result.runtimeError && (
        <Callout tone="bad" title="💥 The page could not be checked">
          <pre className="whitespace-pre-wrap font-mono text-[13px]">{result.runtimeError}</pre>
        </Callout>
      )}
      {result.ruleFailures.length > 0 && (
        <div>
          <div className="text-sm font-bold text-bad">Task requirements</div>
          <ul className="mt-1 space-y-1">
            {result.ruleFailures.map((m) => (
              <li key={m} className="rounded-lg bg-sunken px-3 py-2 text-sm">
                ✗ {m}
              </li>
            ))}
          </ul>
        </div>
      )}
      {result.results.length > 0 && <TestList tests={result.results} />}
      <NextActions passed={result.passed} onSimilar={onSimilar} next={next} />
    </div>
  );
}

function SupportFiles({ files }: { files: Files }): ReactElement | null {
  const entries = WEB_FILES.flatMap((name) => (files[name] === undefined ? [] : [[name, files[name] ?? ''] as const]));
  if (entries.length === 0) return null;
  return (
    <div className="mt-4 space-y-2">
      {entries.map(([name, code]) => (
        <Collapsible
          key={name}
          title={
            <span>
              {ICON_OF[name]} <span className="font-mono">{name}</span> <span className="font-normal text-muted">— part of the page (read-only)</span>
            </span>
          }
        >
          <CodeBlock code={code} lang={LANGUAGE_OF[name]} />
        </Collapsible>
      ))}
    </div>
  );
}

function SolutionFiles({ data }: { data: WebTaskFiles }): ReactElement {
  const names = WEB_FILES.filter((name) => data.solution[name] !== undefined);
  return (
    <div className="card space-y-3 p-4">
      <div className="text-sm font-bold">📗 Author&apos;s solution</div>
      {names.map((name) => (
        <div key={name}>
          <div className="mb-1 font-mono text-xs text-muted">{name}</div>
          <CodeBlock code={data.solution[name] ?? ''} lang={LANGUAGE_OF[name]} />
        </div>
      ))}
      <p className="text-xs text-muted">Your page can be different and still correct — what matters is that the checks pass.</p>
    </div>
  );
}
