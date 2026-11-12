import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { TechCheckQuestion, TechCheckTask } from '../../content/schema';
import type { Course } from '../../content/loader';
import { useCourseForModule } from '../../app/currentCourse';
import { useProgress } from '../progress/store';
import { Markdown } from '../../components/Markdown';
import { Callout } from '../../components/ui';
import { CopyButton, CopyForReview, HintsPanel, NextActions } from './shared';
import {
  claudePrompt,
  drawSession,
  mentorSheet,
  questionPool,
  questionScore,
  reviewBundle,
  sessionScore,
  toPercent,
  topicLabel,
  topicResults,
  topicSlugs,
  type Notes,
  type Ticks,
} from './techCheck';
import type { TaskViewProps } from './types';

type Phase = 'intro' | 'asking' | 'reveal' | 'results';

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const CLOCK_DIGITS = 2;

function formatClock(seconds: number): string {
  const abs = Math.abs(seconds);
  const clock = `${Math.floor(abs / SECONDS_PER_MINUTE)}:${String(abs % SECONDS_PER_MINUTE).padStart(CLOCK_DIGITS, '0')}`;
  return seconds < 0 ? `+${clock}` : clock;
}

/** Seconds left for the current question; goes negative when the time is over. Restarts when `questionKey` changes. */
function useCountdown(running: boolean, questionKey: string, total: number): number {
  const [state, setState] = useState({ key: questionKey, left: total });
  const left = state.key === questionKey ? state.left : total;
  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(
      () => setState((prev) => ({ key: questionKey, left: (prev.key === questionKey ? prev.left : total) - 1 })),
      MS_PER_SECOND,
    );
    return () => clearInterval(timer);
  }, [running, questionKey, total]);
  return left;
}

const scrollToTop = () => document.getElementById('main')?.scrollTo({ top: 0, behavior: 'smooth' });

function FollowUp({ followUp }: { followUp: NonNullable<TechCheckQuestion['followUp']> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 rounded-xl border border-line bg-sunken px-4 py-3">
      <div className="hand text-pen">The interviewer asks next:</div>
      <Markdown compact>{followUp.question}</Markdown>
      <p className="mt-1 text-xs text-muted">Answer it out loud too — this one is not scored.</p>
      {open ? (
        <div className="mt-2 border-t border-line pt-2">
          <Markdown compact>{followUp.answer}</Markdown>
        </div>
      ) : (
        <button className="btn btn-secondary btn-sm mt-2" onClick={() => setOpen(true)}>
          Show answer
        </button>
      )}
    </div>
  );
}

function KeyPoints({ q, said, onToggle }: { q: TechCheckQuestion; said: number[]; onToggle: (i: number) => void }) {
  return (
    <div className="mt-4">
      <div className="text-sm font-semibold">Tick only the key points you actually said</div>
      <ul className="mt-2 space-y-1.5">
        {q.keyPoints.map((point, i) => (
          <li key={i}>
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:border-accent/50">
              <input type="checkbox" className="mt-1" checked={said.includes(i)} onChange={() => onToggle(i)} />
              <Markdown compact className="min-w-0 flex-1 [&_p]:my-0">
                {point}
              </Markdown>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-1.5 text-xs text-muted">
        This answer: {said.length}/{q.keyPoints.length} key points
      </div>
    </div>
  );
}

function ScoreBar({ share }: { share: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-sunken">
      <div className="h-full rounded-full bg-accent" style={{ width: `${toPercent(share)}%` }} />
    </div>
  );
}

function TopicTable({ questions, ticks, course, passScore }: { questions: TechCheckQuestion[]; ticks: Ticks; course: Course | undefined; passScore: number }) {
  return (
    <div className="card p-5">
      <div className="text-sm font-semibold">By topic</div>
      <ul className="mt-3 space-y-3">
        {topicResults(questions, ticks, course).map((t) => (
          <li key={t.slug}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <Link to={`/module/${t.slug}`} className="min-w-0 hover:text-accent-fg">
                {t.label}
              </Link>
              <span className="flex items-center gap-2">
                {t.score < passScore && <span className="chip chip-warn">revisit</span>}
                <span className="tabular-nums text-muted">
                  {toPercent(t.score)}% · {t.count} {t.count === 1 ? 'question' : 'questions'}
                </span>
              </span>
            </div>
            <div className="mt-1.5">
              <ScoreBar share={t.score} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuestionReview({ questions, ticks, notes }: { questions: TechCheckQuestion[]; ticks: Ticks; notes: Notes }) {
  return (
    <div className="card p-5">
      <div className="text-sm font-semibold">Your answers</div>
      <ol className="mt-3 space-y-4">
        {questions.map((q, n) => {
          const said = ticks[q.id] ?? [];
          return (
            <li key={q.id} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
              <div className="flex items-start justify-between gap-3">
                <Markdown compact className="min-w-0 flex-1 font-semibold">
                  {`${n + 1}. ${q.question}`}
                </Markdown>
                <span className="chip tabular-nums">{toPercent(questionScore(q, ticks))}%</span>
              </div>
              {notes[q.id]?.trim() && <p className="mt-1 whitespace-pre-wrap text-sm text-muted">Notes: {notes[q.id]}</p>}
              <ul className="mt-2 space-y-1 text-sm">
                {q.keyPoints.map((p, i) => (
                  <li key={i} className={`flex gap-2 ${said.includes(i) ? 'text-ok' : 'text-bad'}`}>
                    <span>{said.includes(i) ? '✓' : '✗'}</span>
                    <Markdown compact className="min-w-0 flex-1 text-fg [&_p]:my-0">
                      {p}
                    </Markdown>
                  </li>
                ))}
              </ul>
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-muted hover:text-fg">Model answer</summary>
                <div className="mt-1 rounded-lg bg-sunken px-3 py-2">
                  <Markdown compact>{q.answer}</Markdown>
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function TechCheckTaskView({ ct, seed, header, onSimilar, next }: TaskViewProps) {
  const task = ct.task as TechCheckTask;
  const course = useCourseForModule(ct.moduleSlug);
  const recordAttempt = useProgress((s) => s.recordAttempt);
  const pool = useMemo(() => questionPool(task, course), [task, course]);
  const session = useMemo(() => drawSession(pool, task.show, ct.id, seed, course), [pool, task.show, ct.id, seed, course]);
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [ticks, setTicks] = useState<Ticks>({});
  const [notes, setNotes] = useState<Notes>({});

  const q = session[index];
  const left = useCountdown(phase === 'asking', q?.id ?? '', task.secondsPerQuestion);
  const score = sessionScore(session, ticks);
  const passed = score >= task.passScore;
  const passPercent = toPercent(task.passScore);
  const isLast = index === session.length - 1;
  const topics = topicSlugs(pool, course).map((slug) => topicLabel(slug, course));

  const buildPrompt = () => claudePrompt(pool, session.length, course);
  const buildSheet = () => mentorSheet(task.title, pool, session.length, course);

  const start = () => {
    setTicks({});
    setNotes({});
    setIndex(0);
    setPhase('asking');
    scrollToTop();
  };

  const advance = () => {
    if (isLast) {
      recordAttempt(ct.id, passed);
      setPhase('results');
    } else {
      setIndex(index + 1);
      setPhase('asking');
    }
    scrollToTop();
  };

  const toggle = (questionId: string, point: number) =>
    setTicks((prev) => {
      const said = prev[questionId] ?? [];
      return { ...prev, [questionId]: said.includes(point) ? said.filter((x) => x !== point) : [...said, point] };
    });

  const claudeButton = (
    <CopyButton
      label="🎙 Practice with Claude"
      className="btn btn-secondary"
      build={buildPrompt}
      title="Copies an interviewer prompt with this question bank — paste it into a chat with Claude and answer one question at a time"
    />
  );

  if (phase === 'intro' || !q) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-7 lg:px-8">
        {header}
        {task.intro && <Markdown>{task.intro}</Markdown>}
        <div className="card mt-5 p-5">
          <div className="text-sm font-semibold">How it works</div>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">
            <li>
              Read the question and answer <b>out loud</b>, as at a real interview — about {Math.round(task.secondsPerQuestion / SECONDS_PER_MINUTE)} min per
              question. Typing notes is optional.
            </li>
            <li>Open the model answer and honestly tick only the key points you actually said.</li>
            <li>
              Your score is the share of key points you covered. Pass mark: {passPercent}%. A retry draws a new set of questions.
            </li>
          </ol>
          <p className="mt-3 text-sm text-muted">
            {session.length} questions from a bank of {pool.length}, topic by topic:
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {topics.map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>
          {session.length === 0 ? (
            <div className="mt-4">
              <Callout tone="warn" title="No questions for this course">
                This tech check covers modules that are not part of the current course.
              </Callout>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn btn-primary" onClick={start}>
                ▶ Start the tech check
              </button>
              {claudeButton}
              <CopyButton
                label="👥 Questions for a mentor"
                className="btn btn-secondary"
                build={buildSheet}
                title="Copies the questions with key points — give them to a mentor or a friend who plays the interviewer"
              />
            </div>
          )}
        </div>
        <div className="mt-6">
          <HintsPanel taskId={ct.id} hints={task.hints} />
        </div>
      </div>
    );
  }

  if (phase === 'results') {
    return (
      <div className="mx-auto max-w-3xl px-5 py-7 lg:px-8">
        {header}
        <div className="space-y-4">
          <Callout tone={passed ? 'ok' : 'bad'} title={passed ? `Passed: ${toPercent(score)}% 🎉` : `Not yet: ${toPercent(score)}%`}>
            {passed
              ? 'Good work. Keep it fresh: run the same check with Claude or a mentor — a live interviewer asks follow-ups.'
              : `The pass mark is ${passPercent}%. Revisit the topics marked below, then take a new set of questions.`}
          </Callout>
          <NextActions passed={passed} onSimilar={onSimilar} similarLabel="New set of questions" next={next} />
          <TopicTable questions={session} ticks={ticks} course={course} passScore={task.passScore} />
          <QuestionReview questions={session} ticks={ticks} notes={notes} />
          <div className="flex flex-wrap items-center gap-2">
            {claudeButton}
            <CopyForReview build={() => reviewBundle(task.title, session, ticks, notes)} />
          </div>
          <HintsPanel taskId={ct.id} hints={task.hints} />
        </div>
      </div>
    );
  }

  const said = ticks[q.id] ?? [];
  const overtime = left < 0;

  return (
    <div className="mx-auto max-w-3xl px-5 py-7 lg:px-8">
      {header}
      <div className="mb-3">
        <ScoreBar share={index / session.length} />
      </div>
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-muted">
            Question {index + 1} of {session.length}
          </span>
          <span className="chip">{topicLabel(q.module, course)}</span>
        </div>
        <div className="mt-3 text-[1.05rem]">
          <Markdown>{q.question}</Markdown>
        </div>

        {phase === 'asking' && (
          <>
            <div className={`mt-3 font-mono text-sm tabular-nums ${overtime ? 'text-warn' : 'text-muted'}`}>
              ⏱ {formatClock(left)}
              {overtime && ' — time is up, wrap up your answer'}
            </div>
            <textarea
              className="input mt-3 min-h-24"
              placeholder="Notes (optional): key words of your answer"
              value={notes[q.id] ?? ''}
              onChange={(e) => setNotes((prev) => ({ ...prev, [q.id]: e.target.value }))}
            />
            <button className="btn btn-primary mt-3" onClick={() => setPhase('reveal')}>
              Show the model answer
            </button>
          </>
        )}

        {phase === 'reveal' && (
          <>
            {notes[q.id]?.trim() && (
              <div className="mt-3 rounded-lg bg-sunken px-3 py-2 text-sm">
                <div className="text-xs text-muted">Your notes</div>
                <p className="whitespace-pre-wrap">{notes[q.id]}</p>
              </div>
            )}
            <div className="mt-4 rounded-xl border border-ok/40 bg-ok-soft px-4 py-3">
              <div className="text-xs font-semibold text-ok">Model answer</div>
              <Markdown compact>{q.answer}</Markdown>
            </div>
            <KeyPoints q={q} said={said} onToggle={(i) => toggle(q.id, i)} />
            {q.followUp && <FollowUp key={q.id} followUp={q.followUp} />}
            <button className="btn btn-primary mt-4" onClick={advance}>
              {isLast ? 'See the results' : 'Next question →'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default TechCheckTaskView;
