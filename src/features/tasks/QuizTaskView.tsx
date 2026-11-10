import { useMemo, useState } from 'react';
import type { QuizQuestion, QuizTask } from '../../content/schema';
import { useProgress } from '../progress/store';
import { CodeBlock, Markdown } from '../../components/Markdown';
import { Callout } from '../../components/ui';
import { hashString, mulberry32, shuffle } from '../../lib/random';
import { HintsPanel, NextActions } from './shared';
import type { TaskViewProps } from './types';

type Answer = number[] | string;

interface PreparedQuestion {
  question: QuizQuestion;
  order: number[];
}

function buildQuiz(task: QuizTask, id: string, seed: number): PreparedQuestion[] {
  const rng = mulberry32(hashString(id) + seed * 7919);
  const count = Math.min(task.show ?? task.questions.length, task.questions.length);
  const pool = seed === 0 ? task.questions.slice(0, count) : shuffle(task.questions, rng).slice(0, count);
  return pool.map((q) => ({ question: q, order: q.kind === 'text' ? [] : shuffle(q.options.map((_, i) => i), rng) }));
}

const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/;$/, '')
    .replace(/^['"`](.*)['"`]$/, '$1');

export function isCorrect(q: QuizQuestion, a: Answer | undefined): boolean {
  if (q.kind === 'text') return typeof a === 'string' && q.accept.some((x) => norm(x) === norm(a));
  const sel = Array.isArray(a) ? a : [];
  const correct = q.options.flatMap((o, i) => (o.correct ? [i] : []));
  if (q.kind === 'single') return sel.length === 1 && correct.includes(sel[0]);
  return sel.length === correct.length && correct.every((i) => sel.includes(i));
}

const hasAnswer = (a: Answer | undefined) => (Array.isArray(a) ? a.length > 0 : typeof a === 'string' && a.trim().length > 0);

export function QuizTaskView({ ct, seed, header, onSimilar, next }: TaskViewProps) {
  const task = ct.task as QuizTask;
  const recordAttempt = useProgress((s) => s.recordAttempt);
  const questions = useMemo(() => buildQuiz(task, ct.id, seed), [task, ct.id, seed]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [submitted, setSubmitted] = useState(false);

  const results = questions.map((p) => isCorrect(p.question, answers[p.question.id]));
  const score = results.filter(Boolean).length;
  const passed = score / questions.length >= task.passScore;
  const allAnswered = questions.every((p) => hasAnswer(answers[p.question.id]));

  const submit = () => {
    setSubmitted(true);
    recordAttempt(ct.id, passed);
    document.getElementById('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const choose = (q: QuizQuestion, i: number) => {
    if (submitted) return;
    setAnswers((prev) => {
      if (q.kind === 'single') return { ...prev, [q.id]: [i] };
      const cur = Array.isArray(prev[q.id]) ? (prev[q.id] as number[]) : [];
      return { ...prev, [q.id]: cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i] };
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-7 lg:px-8">
      {header}
      {task.intro && <Markdown>{task.intro}</Markdown>}
      <p className="mt-2 text-sm text-muted">
        {questions.length} questions · pass mark {Math.round(task.passScore * 100)}%
        {task.questions.length > questions.length && ` · a retry draws a new set from ${task.questions.length} questions`}
      </p>

      {submitted && (
        <div className="mt-5 space-y-3">
          <Callout tone={passed ? 'ok' : 'bad'} title={passed ? `Passed: ${score}/${questions.length} 🎉` : `Not yet: ${score}/${questions.length}`}>
            {passed
              ? 'Read the explanations below — even for the questions you got right.'
              : `You need ${Math.ceil(task.passScore * questions.length)} correct answers. Read the explanations for the wrong ones, then try a new set of questions.`}
          </Callout>
          <NextActions passed={passed} onSimilar={onSimilar} similarLabel="New set of questions" next={next} />
        </div>
      )}

      <div className="mt-6 space-y-4">
        {questions.map((p, n) => {
          const q = p.question;
          const a = answers[q.id];
          const ok = results[n];
          return (
            <div key={q.id} className={`card p-5 ${submitted ? (ok ? 'border-ok/50' : 'border-bad/50') : ''}`}>
              <div className="flex items-start gap-3">
                <span className="pt-0.5 text-sm font-semibold tabular-nums text-faint">{n + 1}.</span>
                <div className="min-w-0 flex-1">
                  <Markdown compact>{q.text}</Markdown>
                  {q.kind === 'multiple' && <div className="text-xs font-medium text-muted">Select all that apply</div>}
                </div>
                {submitted && <span className={`chip ${ok ? 'chip-ok' : 'chip-bad'}`}>{ok ? 'correct' : 'wrong'}</span>}
              </div>
              {q.code && (
                <div className="mt-2">
                  <CodeBlock code={q.code} />
                </div>
              )}

              {q.kind === 'text' ? (
                <div className="mt-3">
                  <input
                    className="input font-mono"
                    placeholder={q.placeholder ?? 'Your answer'}
                    value={typeof a === 'string' ? a : ''}
                    disabled={submitted}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  />
                  {submitted && !ok && (
                    <div className="mt-2 text-sm text-muted">
                      Correct answer: <code className="font-mono text-ok">{q.accept[0]}</code>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {p.order.map((i) => {
                    const o = q.options[i];
                    const chosen = Array.isArray(a) && a.includes(i);
                    let tone = chosen ? 'border-accent bg-accent-soft' : 'border-line hover:border-accent/50';
                    if (submitted) {
                      tone = o.correct ? 'border-ok/60 bg-ok-soft' : chosen ? 'border-bad/60 bg-bad-soft' : 'border-line opacity-70';
                    }
                    return (
                      <label key={i} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition-colors ${tone}`}>
                        <input
                          type={q.kind === 'single' ? 'radio' : 'checkbox'}
                          name={q.id}
                          className="mt-1.5"
                          checked={chosen}
                          disabled={submitted}
                          onChange={() => choose(q, i)}
                        />
                        <div className="min-w-0 flex-1">
                          <Markdown compact>{o.text}</Markdown>
                          {submitted && o.explain && (chosen || o.correct) && <div className="mt-1 text-xs text-muted">{o.explain}</div>}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {submitted && q.explanation && (
                <div className="mt-3 rounded-lg bg-sunken px-3 py-2">
                  <Markdown compact>{q.explanation}</Markdown>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 space-y-4">
        {!submitted ? (
          <button className="btn btn-primary" disabled={!allAnswered} onClick={submit}>
            Check answers
          </button>
        ) : (
          <NextActions passed={passed} onSimilar={onSimilar} similarLabel="New set of questions" next={next} />
        )}
        <HintsPanel taskId={ct.id} hints={task.hints} />
      </div>
    </div>
  );
}
