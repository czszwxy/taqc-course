import { useEffect, useState } from 'react';
import { PRIORITIES, TEST_TYPES, type TestCaseModel, type TestCaseTask } from '../../content/schema';
import { useProgress } from '../progress/store';
import { Markdown } from '../../components/Markdown';
import { Callout } from '../../components/ui';
import { checkTestCase, type FormValues } from './forms';
import { Field, ModelView, Select, StepsEditor, TextArea, TextInput } from './FormFields';
import { Collapsible, CopyForReview, ExplanationPanel, FailureList, HintsPanel, NextActions, SelfReviewChecklist, PlaygroundLink } from './shared';
import type { TaskViewProps } from './types';

interface TestCaseForm {
  title: string;
  preconditions: string;
  testData: string;
  steps: string[];
  expectedResult: string;
  priority: string;
  type: string;
}

const EMPTY: TestCaseForm = { title: '', preconditions: '', testData: '', steps: [''], expectedResult: '', priority: '', type: '' };

export function testCaseRows(t: TestCaseModel | TestCaseForm): [string, string | string[]][] {
  return [
    ['Title', t.title],
    ['Type', t.type],
    ['Priority', t.priority],
    ['Preconditions', t.preconditions],
    ['Test data', t.testData],
    ['Steps', t.steps.filter((s) => s.trim())],
    ['Expected result', t.expectedResult],
  ];
}

export function TestCaseTaskView({ ct, header, onSimilar, next }: TaskViewProps) {
  const task = ct.task as TestCaseTask;
  const saveDraft = useProgress((s) => s.saveDraft);
  const recordAttempt = useProgress((s) => s.recordAttempt);
  const markSolutionViewed = useProgress((s) => s.markSolutionViewed);
  const progress = useProgress((s) => s.tasks[ct.id]);
  const [form, setForm] = useState<TestCaseForm>(() => {
    const d = useProgress.getState().drafts[ct.id] as Partial<TestCaseForm> | undefined;
    return { ...EMPTY, ...d };
  });
  const [result, setResult] = useState<{ passed: boolean; failures: string[] } | null>(null);
  const [showModel, setShowModel] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => saveDraft(ct.id, form), 400);
    return () => clearTimeout(t);
  }, [form, ct.id, saveDraft]);

  const set = <K extends keyof TestCaseForm>(k: K, v: TestCaseForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (result && !result.passed) setResult(null);
  };

  const submit = () => {
    const failures = checkTestCase(form as unknown as FormValues, task.rules);
    const passed = failures.length === 0;
    setResult({ passed, failures });
    recordAttempt(ct.id, passed);
    if (passed) setShowModel(true);
  };

  const failed = progress?.failedAttempts ?? 0;
  const solved = progress?.status === 'solved';
  const locked = Boolean(result?.passed);

  const revealModel = () => {
    if (!solved && failed < 2 && !confirm('Try at least twice before looking at the model answer. Show it anyway?')) return;
    markSolutionViewed(ct.id);
    setShowModel(true);
  };

  const reviewBundle = () =>
    [
      `## Task: ${task.title}`,
      task.statement,
      '## My test case',
      ...testCaseRows(form).map(([k, v]) => `**${k}:** ${Array.isArray(v) ? '\n' + v.map((s, i) => `${i + 1}. ${s}`).join('\n') : v}`),
      '## Model answer',
      ...testCaseRows(task.model).map(([k, v]) => `**${k}:** ${Array.isArray(v) ? '\n' + v.map((s, i) => `${i + 1}. ${s}`).join('\n') : v}`),
      '## Review criteria',
      ...task.checklist.map((c) => `- ${c}`),
      '',
      'Please review my test case against the criteria and the model answer. What is good, what is missing, and how would a senior QA improve it?',
    ].join('\n\n');

  return (
    <div className="mx-auto max-w-4xl px-5 py-7 lg:px-8">
      {header}
      <Markdown>{task.statement}</Markdown>
      <PlaygroundLink id={task.playground} />

      <div className="card mt-6 space-y-4 p-5">
        <div className="text-sm font-semibold">Your test case</div>
        <Field label="Title" required hint="What is checked + under which condition">
          <TextInput value={form.title} onChange={(v) => set('title', v)} disabled={locked} placeholder="Sign-up: … when …" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" required>
            <Select value={form.type} onChange={(v) => set('type', v)} options={TEST_TYPES} disabled={locked} />
          </Field>
          <Field label="Priority" required>
            <Select value={form.priority} onChange={(v) => set('priority', v)} options={PRIORITIES} disabled={locked} />
          </Field>
        </div>
        <Field label="Preconditions" hint="State of the system before step 1">
          <TextArea value={form.preconditions} onChange={(v) => set('preconditions', v)} disabled={locked} rows={2} />
        </Field>
        <Field label="Test data" hint="Exact values you will enter">
          <TextArea value={form.testData} onChange={(v) => set('testData', v)} disabled={locked} rows={3} />
        </Field>
        <Field label="Steps" required hint="One action per step. Enter adds a new step.">
          <StepsEditor steps={form.steps} onChange={(s) => set('steps', s)} disabled={locked} placeholder="Open …" />
        </Field>
        <Field label="Expected result" required hint="Observable and verifiable outcome">
          <TextArea value={form.expectedResult} onChange={(v) => set('expectedResult', v)} disabled={locked} rows={2} />
        </Field>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {!locked && (
            <button className="btn btn-primary" onClick={submit}>
              Submit test case
            </button>
          )}
          <CopyForReview build={reviewBundle} />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {result && !result.passed && <FailureList title="Your test case needs some fixes:" items={result.failures} />}
        {result?.passed && (
          <Callout tone="ok" title="All checks passed 🎉">
            Automatic checks cover structure and key details. Now compare with the model answer and go through the self-review checklist.
          </Callout>
        )}
        {result && <NextActions passed={result.passed} onSimilar={onSimilar} next={next} />}
        {task.explanation && (failed > 0 || solved) && <ExplanationPanel text={task.explanation} defaultOpen={result !== null && !result.passed} />}
        <HintsPanel taskId={ct.id} hints={task.hints} />
        {showModel ? (
          <>
            <Collapsible title="📗 Model answer" defaultOpen>
              <ModelView rows={testCaseRows(task.model)} />
            </Collapsible>
            <SelfReviewChecklist items={task.checklist} />
          </>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={revealModel}>
            👀 Show model answer
          </button>
        )}
      </div>
    </div>
  );
}
