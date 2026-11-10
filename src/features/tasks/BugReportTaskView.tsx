import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PRIORITIES, SEVERITIES, type BugReportModel, type BugReportTask, type KnownBug } from '../../content/schema';
import { useProgress } from '../progress/store';
import { Markdown } from '../../components/Markdown';
import { Callout, ProgressBar } from '../../components/ui';
import { checkBugReportQuality, matchBug, type FormValues } from './forms';
import { Field, ModelView, Select, StepsEditor, TextArea, TextInput } from './FormFields';
import { Collapsible, CopyForReview, ExplanationPanel, FailureList, HintsPanel, NextActions, SelfReviewChecklist } from './shared';
import { PLAYGROUND_PAGES } from '../../playground/registry';
import type { TaskViewProps } from './types';

interface BugForm {
  title: string;
  environment: string;
  preconditions: string;
  steps: string[];
  testData: string;
  actualResult: string;
  expectedResult: string;
  severity: string;
  priority: string;
  attachments: string;
}

interface Draft {
  form: BugForm;
  found: string[];
}

const EMPTY: BugForm = {
  title: '',
  environment: '',
  preconditions: '',
  steps: [''],
  testData: '',
  actualResult: '',
  expectedResult: '',
  severity: '',
  priority: '',
  attachments: '',
};

type Outcome =
  | { kind: 'quality'; failures: string[] }
  | { kind: 'unmatched' }
  | { kind: 'duplicate'; bug: KnownBug }
  | { kind: 'severity'; bug: KnownBug }
  | { kind: 'found'; bug: KnownBug };

export function bugRows(b: BugReportModel | BugForm): [string, string | string[]][] {
  return [
    ['Summary', b.title],
    ['Severity', b.severity],
    ['Priority', b.priority],
    ['Environment', b.environment],
    ['Preconditions', b.preconditions],
    ['Steps to reproduce', b.steps.filter((s) => s.trim())],
    ['Test data', b.testData],
    ['Actual result', b.actualResult],
    ['Expected result', b.expectedResult],
    ['Attachments', b.attachments],
  ];
}

export function BugReportTaskView({ ct, header, next }: TaskViewProps) {
  const task = ct.task as BugReportTask;
  const saveDraft = useProgress((s) => s.saveDraft);
  const recordAttempt = useProgress((s) => s.recordAttempt);
  const markSolutionViewed = useProgress((s) => s.markSolutionViewed);
  const solved = useProgress((s) => s.tasks[ct.id]?.status === 'solved');
  const failed = useProgress((s) => s.tasks[ct.id]?.failedAttempts ?? 0);

  const [draft, setDraft] = useState<Draft>(() => {
    const d = useProgress.getState().drafts[ct.id] as Partial<Draft> | undefined;
    return { form: { ...EMPTY, ...d?.form }, found: d?.found ?? [] };
  });
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [revealAll, setRevealAll] = useState(false);
  const { form, found } = draft;

  useEffect(() => {
    const t = setTimeout(() => saveDraft(ct.id, draft), 400);
    return () => clearTimeout(t);
  }, [draft, ct.id, saveDraft]);

  const set = <K extends keyof BugForm>(k: K, v: BugForm[K]) => {
    setDraft((d) => ({ ...d, form: { ...d.form, [k]: v } }));
    if (outcome && outcome.kind !== 'found') setOutcome(null);
  };

  const submit = () => {
    const values = form as unknown as FormValues;
    const failures = checkBugReportQuality(values);
    let result: Outcome;
    let newFound = found;
    if (failures.length) result = { kind: 'quality', failures };
    else {
      const m = matchBug(values, task.bugs, found);
      if (m.duplicateOf) result = { kind: 'duplicate', bug: m.duplicateOf };
      else if (!m.bug) result = { kind: 'unmatched' };
      else if (!m.bug.severity.includes(form.severity as BugReportModel['severity'])) result = { kind: 'severity', bug: m.bug };
      else {
        result = { kind: 'found', bug: m.bug };
        newFound = [...found, m.bug.id];
      }
    }
    setOutcome(result);
    setDraft({ form, found: newFound });
    recordAttempt(ct.id, newFound.length >= task.minBugs);
  };

  const startNewReport = () => {
    setDraft((d) => ({ ...d, form: { ...EMPTY, environment: d.form.environment, preconditions: d.form.preconditions } }));
    setOutcome(null);
    document.getElementById('bug-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const playground = PLAYGROUND_PAGES.find((p) => p.id === task.playground);
  const foundBugs = task.bugs.filter((b) => found.includes(b.id));
  const hiddenBugs = task.bugs.filter((b) => !found.includes(b.id));
  const goalReached = found.length >= task.minBugs;
  const locked = outcome?.kind === 'found';

  const reviewBundle = () =>
    [
      `## Task: ${task.title}`,
      task.statement,
      '## My bug report',
      ...bugRows(form).map(([k, v]) => `**${k}:** ${Array.isArray(v) ? '\n' + v.map((s, i) => `${i + 1}. ${s}`).join('\n') : v}`),
      '## Review criteria',
      ...task.checklist.map((c) => `- ${c}`),
      '',
      'Please review my bug report like a senior QA / team lead would: clarity, reproducibility, severity & priority, anything missing.',
    ].join('\n\n');

  return (
    <div className="mx-auto max-w-4xl px-5 py-7 lg:px-8">
      {header}
      <Markdown>{task.statement}</Markdown>
      {playground && (
        <Link to={playground.path} target="_blank" className="btn btn-secondary mt-3">
          🐞 Open “{playground.title}” in a new tab ↗
        </Link>
      )}

      <div className="card mt-5 p-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold">
            Bugs found: {found.length} / {task.bugs.length}
          </span>
          <span className={goalReached ? 'chip chip-ok' : 'chip'}>goal: {task.minBugs}</span>
        </div>
        <ProgressBar className="mt-2" percent={(found.length / task.bugs.length) * 100} tone={goalReached ? 'ok' : 'accent'} />
        {foundBugs.length > 0 && (
          <div className="mt-3 space-y-2">
            {foundBugs.map((b) => (
              <Collapsible key={b.id} title={`✓ ${b.title}`}>
                <div className="mb-2 text-xs text-muted">Model bug report:</div>
                <ModelView rows={bugRows(b.model)} />
              </Collapsible>
            ))}
          </div>
        )}
      </div>

      <div id="bug-form" className="card mt-5 space-y-4 p-5">
        <div className="text-sm font-semibold">New bug report</div>
        <Field label="Summary (title)" required hint="What is wrong + where + when. No “Bug:” prefix, no emotions.">
          <TextInput value={form.title} onChange={(v) => set('title', v)} disabled={locked} placeholder="Sign-up: … is … when …" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Severity" required hint="Impact on the user/system">
            <Select value={form.severity} onChange={(v) => set('severity', v)} options={SEVERITIES} disabled={locked} />
          </Field>
          <Field label="Priority" required hint="How soon to fix">
            <Select value={form.priority} onChange={(v) => set('priority', v)} options={PRIORITIES} disabled={locked} />
          </Field>
          <Field label="Environment" required>
            <TextInput value={form.environment} onChange={(v) => set('environment', v)} disabled={locked} placeholder="Chrome 131, Windows 11" />
          </Field>
        </div>
        <Field label="Preconditions">
          <TextArea value={form.preconditions} onChange={(v) => set('preconditions', v)} disabled={locked} rows={2} />
        </Field>
        <Field label="Steps to reproduce" required hint="Numbered, one action per step. Enter adds a new step.">
          <StepsEditor steps={form.steps} onChange={(s) => set('steps', s)} disabled={locked} placeholder="Open …" />
        </Field>
        <Field label="Test data" hint="Exact values you used">
          <TextArea value={form.testData} onChange={(v) => set('testData', v)} disabled={locked} rows={2} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Actual result" required>
            <TextArea value={form.actualResult} onChange={(v) => set('actualResult', v)} disabled={locked} />
          </Field>
          <Field label="Expected result" required hint="Refer to the requirement">
            <TextArea value={form.expectedResult} onChange={(v) => set('expectedResult', v)} disabled={locked} />
          </Field>
        </div>
        <Field label="Attachments" hint="What you would attach in a real tracker: screenshot, video, console log…">
          <TextInput value={form.attachments} onChange={(v) => set('attachments', v)} disabled={locked} />
        </Field>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {!locked ? (
            <button className="btn btn-primary" onClick={submit}>
              Submit bug report
            </button>
          ) : (
            <button className="btn btn-primary" onClick={startNewReport}>
              + Report another bug
            </button>
          )}
          <CopyForReview build={reviewBundle} />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {outcome?.kind === 'quality' && <FailureList title="The report isn't ready to file yet:" items={outcome.failures} />}
        {outcome?.kind === 'unmatched' && (
          <Callout tone="warn" title="We couldn't match this report to a known bug">
            Either this behaviour matches the requirements (re-read them!), or the report doesn't name the key details: the exact field, the
            exact value you entered, and what the page did. Make the summary and actual result specific.
          </Callout>
        )}
        {outcome?.kind === 'duplicate' && (
          <Callout tone="warn" title={`Duplicate: “${outcome.bug.title}”`}>
            You already reported this bug. In a real team you would search the tracker first — duplicates waste everybody's time. Look for a
            different bug.
          </Callout>
        )}
        {outcome?.kind === 'severity' && (
          <Callout tone="warn" title="Good find — but check the severity">
            <Markdown compact>{`You found **${outcome.bug.title}**, but severity “${form.severity}” doesn't fit. Expected: ${outcome.bug.severity.join(' or ')}. ${outcome.bug.severityWhy}`}</Markdown>
          </Callout>
        )}
        {outcome?.kind === 'found' && (
          <>
            <Callout tone="ok" title={`Bug found: ${outcome.bug.title} 🎉`}>
              {goalReached
                ? found.length === task.bugs.length
                  ? 'You found every bug on this page. Excellent work!'
                  : `Goal reached! ${task.bugs.length - found.length} more bug(s) are still hiding — keep hunting if you like.`
                : `${task.minBugs - found.length} more to reach the goal.`}
            </Callout>
            <Collapsible title="📗 Compare with the model report" defaultOpen>
              <ModelView rows={bugRows(outcome.bug.model)} />
            </Collapsible>
            <SelfReviewChecklist items={task.checklist} />
          </>
        )}
        {goalReached && next && <NextActions passed onSimilar={undefined} next={next} />}
        {task.explanation && (failed > 0 || solved) && <ExplanationPanel text={task.explanation} />}
        <HintsPanel taskId={ct.id} hints={task.hints} />
        {hiddenBugs.length > 0 &&
          (revealAll ? (
            <Collapsible title={`🙈 Remaining bugs (${hiddenBugs.length})`} defaultOpen>
              <div className="space-y-4">
                {hiddenBugs.map((b) => (
                  <div key={b.id}>
                    <div className="mb-1 font-semibold">{b.title}</div>
                    <ModelView rows={bugRows(b.model)} />
                  </div>
                ))}
              </div>
            </Collapsible>
          ) : (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                if (!goalReached && !confirm('Reveal all remaining bugs? Try to find them yourself first — this is the core skill.')) return;
                markSolutionViewed(ct.id);
                setRevealAll(true);
              }}
            >
              🙈 Reveal remaining bugs
            </button>
          ))}
      </div>
    </div>
  );
}
