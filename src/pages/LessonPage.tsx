import { useEffect } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { course, lessonPath, loadLessonMarkdown, neighbourLessons, taskPath, type CourseLesson } from '../content/loader';
import { TASK_TYPE_LABEL } from '../content/schema';
import { useProgress } from '../features/progress/store';
import { lessonStats, taskStatus } from '../features/progress/selectors';
import { Markdown } from '../components/Markdown';
import { Empty, ProgressBar, StatusIcon } from '../components/ui';
import { useAsync } from '../lib/useAsync';
import { formatModuleNumber } from '../lib/format';
import { LessonMenu } from '../app/LessonMenu';
import { NotFound } from './NotFound';

type Tab = 'theory' | 'resources' | 'practice';

export function LessonPage() {
  const { moduleSlug, lessonSlug } = useParams();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const setLast = useProgress((s) => s.setLast);
  const lesson = course.lessonsById.get(`${moduleSlug}/${lessonSlug}`);
  const tab = (['theory', 'resources', 'practice'].includes(params.get('tab') ?? '') ? params.get('tab') : 'theory') as Tab;

  useEffect(() => {
    if (lesson) setLast(location.pathname + location.search, lesson.title);
  }, [lesson, location.pathname, location.search, setLast]);

  useEffect(() => {
    document.getElementById('main')?.scrollTo({ top: 0 });
  }, [lesson?.id, tab]);

  if (!lesson) return <NotFound />;
  const m = course.modulesBySlug.get(lesson.moduleSlug)!;

  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-4 py-6 lg:px-8 lg:py-8">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-6">
          <LessonMenu module={m} />
        </div>
      </aside>

      <div className="min-w-0 max-w-[50rem] flex-1">
        <details className="mb-5 lg:hidden">
          <summary className="btn btn-secondary btn-sm cursor-pointer list-none">☰ Lessons in this module</summary>
          <div className="mt-3">
            <LessonMenu module={m} />
          </div>
        </details>

        <div className="text-xs font-bold text-muted">
          <Link to={`/module/${m.slug}`} className="hover:text-accent-fg">
            Module {formatModuleNumber(m.number)} · {m.title}
          </Link>
        </div>
        <h1 className="mt-1 font-display text-[1.75rem] font-bold leading-tight lg:text-[2rem]">{lesson.title}</h1>
        <p className="mt-1.5 text-sm text-muted">
          {lesson.summary} · <span className="whitespace-nowrap">~{lesson.minutes} min</span>
        </p>

        <LessonTabs lesson={lesson} tab={tab} onChange={(t) => setParams(t === 'theory' ? {} : { tab: t })} />

        <div className="mt-6">
          {tab === 'theory' && <TheoryTab lesson={lesson} onPractice={() => setParams({ tab: 'practice' })} />}
          {tab === 'resources' && <ResourcesTab lesson={lesson} />}
          {tab === 'practice' && <PracticeTab lesson={lesson} />}
        </div>

        <LessonFooter lesson={lesson} />
      </div>
    </div>
  );
}

function LessonTabs({ lesson, tab, onChange }: { lesson: CourseLesson; tab: Tab; onChange: (t: Tab) => void }) {
  const tasks = useProgress((s) => s.tasks);
  const theoryRead = useProgress((s) => s.theoryRead);
  const s = lessonStats(lesson, { tasks, theoryRead });
  const items: { id: Tab; label: string; badge?: string }[] = [
    { id: 'theory', label: 'Theory', badge: s.theory ? '✓' : undefined },
    { id: 'resources', label: 'Resources', badge: String(lesson.resources.length) },
    { id: 'practice', label: 'Practice', badge: `${s.solved}/${s.required}` },
  ];
  return (
    <div className="mt-5 flex items-end gap-1 border-b-2 border-line">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          className={`-mb-0.5 flex items-center gap-1.5 rounded-t-lg border-2 px-2.5 py-2 sm:gap-2 sm:px-3.5 text-sm font-bold transition-colors ${
            tab === it.id ? 'border-line border-b-surface bg-surface text-fg' : 'border-transparent text-muted hover:text-fg'
          }`}
        >
          {it.label}
          {it.badge && <span className={`chip ${tab === it.id ? 'chip-accent' : ''}`}>{it.badge}</span>}
        </button>
      ))}
      <div className="flex-1" />
      <div className="mb-2 hidden w-40 items-center gap-2 text-xs text-muted sm:flex">
        <ProgressBar percent={s.percent} tone={s.complete ? 'ok' : 'accent'} />
        <span className="tabular-nums">{s.percent}%</span>
      </div>
    </div>
  );
}

function TheoryTab({ lesson, onPractice }: { lesson: CourseLesson; onPractice: () => void }) {
  const md = useAsync(() => loadLessonMarkdown(lesson.id), [lesson.id]);
  const read = useProgress((s) => Boolean(s.theoryRead[lesson.id]));
  const setTheoryRead = useProgress((s) => s.setTheoryRead);

  if (md.loading) return <div className="text-sm text-muted">Loading…</div>;
  if (md.error) return <Empty>Could not load theory: {md.error}</Empty>;

  return (
    <div className="page px-5 py-6 sm:px-8 sm:py-8">
      <Markdown>{md.data ?? ''}</Markdown>
      <div className="mt-10 flex flex-wrap items-center gap-3 border-t-2 border-dashed border-line pt-6">
        <button
          className={`btn ${read ? 'btn-secondary' : 'btn-ok'}`}
          onClick={() => {
            setTheoryRead(lesson.id, !read);
            if (!read) onPractice();
          }}
        >
          {read ? '✓ Theory read (undo)' : '✓ Mark as read & go to practice'}
        </button>
        {read && (
          <button className="btn btn-primary" onClick={onPractice}>
            Go to practice →
          </button>
        )}
      </div>
    </div>
  );
}

const KIND_ICON: Record<string, string> = { docs: '📘', article: '📄', video: '🎬', course: '🎓', tool: '🛠️', book: '📚' };

function ResourcesTab({ lesson }: { lesson: CourseLesson }) {
  const verified = useProgress((s) => s.verifiedLinks);
  const toggleVerified = useProgress((s) => s.toggleVerified);
  if (lesson.resources.length === 0) return <Empty>No external resources for this lesson yet.</Empty>;
  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        Extra materials to go deeper. Links marked <span className="chip chip-warn">needs verification</span> were added by the
        course author and haven&apos;t been checked yet — open them and mark them as checked.
      </p>
      <div className="space-y-2">
        {lesson.resources.map((r) => {
          const isVerified = !r.needsVerification || verified[r.url];
          return (
            <div key={r.url} className="card flex items-start gap-3 p-4">
              <span className="text-xl">{KIND_ICON[r.kind] ?? '🔗'}</span>
              <div className="min-w-0 flex-1">
                <a href={r.url} target="_blank" rel="noreferrer" className="font-medium text-accent-fg hover:underline">
                  {r.title} ↗
                </a>
                <div className="mt-0.5 truncate text-xs text-faint">{r.url}</div>
                {r.note && <div className="mt-1 text-sm text-muted">{r.note}</div>}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="chip">{r.kind}</span>
                  <span className="chip">{r.lang === 'uk' ? '🇺🇦 Українська' : '🇬🇧 English'}</span>
                  {isVerified ? <span className="chip chip-ok">checked</span> : <span className="chip chip-warn">needs verification</span>}
                </div>
              </div>
              {r.needsVerification && (
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-muted">
                  <input type="checkbox" checked={Boolean(verified[r.url])} onChange={() => toggleVerified(r.url)} />
                  I checked it
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PracticeTab({ lesson }: { lesson: CourseLesson }) {
  const tasks = useProgress((s) => s.tasks);
  if (lesson.tasks.length === 0) return <Empty>No practice tasks in this lesson yet.</Empty>;
  return (
    <div className="space-y-2">
      {lesson.tasks.map((t, i) => {
        const st = taskStatus(t, tasks);
        const p = tasks[t.id];
        return (
          <Link key={t.id} to={taskPath(t)} className="card flex items-center gap-3 px-4 py-3 transition-colors hover:border-accent/60">
            <StatusIcon status={st} size={18} />
            <span className="w-5 text-sm tabular-nums text-faint">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{t.task.title}</div>
              <div className="mt-0.5 flex flex-wrap gap-1.5 text-xs text-muted">
                <span className="chip">{TASK_TYPE_LABEL[t.task.type]}</span>
                {t.variants.length > 0 && <span className="chip">+{t.variants.length} similar</span>}
                {t.task.optional && <span className="chip">optional</span>}
                {p && p.attempts > 0 && <span>{p.attempts} attempt(s)</span>}
              </div>
            </div>
            <span className="text-sm text-muted">→</span>
          </Link>
        );
      })}
    </div>
  );
}

function LessonFooter({ lesson }: { lesson: CourseLesson }) {
  const { prev, next } = neighbourLessons(lesson.id);
  return (
    <div className="mt-12 flex items-center justify-between gap-3 border-t border-line pt-5 text-sm">
      {prev ? (
        <Link to={lessonPath(prev)} className="btn btn-ghost min-w-0 whitespace-normal text-left">
          ← {prev.title}
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link to={lessonPath(next)} className="btn btn-ghost ml-auto min-w-0 whitespace-normal text-right">
          {next.title} →
        </Link>
      )}
    </div>
  );
}
