import { Link } from 'react-router-dom';
import { course, lessonPath, type CourseModule } from '../content/loader';
import { useProgress } from '../features/progress/store';
import { courseStats, lessonStats, moduleStats } from '../features/progress/selectors';
import { ProgressBar, trackClass } from '../components/ui';
import { formatModuleNumber } from '../lib/format';

type ProgressInput = Parameters<typeof moduleStats>[1];
type ModuleProgress = ReturnType<typeof moduleStats>;
type PlannedLesson = CourseModule['planned'][number];

const FULL_PERCENT = 100;

function heroNote(done: number, total: number): string {
  if (done === 0) return '← start here!';
  if (done === total) return 'all done — you are ready! 🎉';
  return `${done} of ${total} lessons done — keep going!`;
}

/** Handwritten stamp on a module card. */
function moduleStamp(m: CourseModule, ms: ModuleProgress): { text: string; className: string } | null {
  if (!m.available) return { text: 'coming soon', className: 'text-faint' };
  if (ms.total > 0 && ms.completed === ms.total) return { text: 'done ✓', className: 'text-ok' };
  if (ms.started) return { text: 'in progress', className: 'text-accent-fg' };
  return null;
}

/** One small checkbox per planned lesson on a module card. */
function tickClass(p: PlannedLesson, data: ProgressInput): string {
  const base = 'h-2.5 w-2.5 rounded-[3px] border';
  if (!p.lesson) return `${base} border-dashed border-line`;
  const s = lessonStats(p.lesson, data);
  if (s.complete) return `${base} border-ok bg-ok`;
  if (s.started) return `${base} border-accent bg-accent-soft`;
  return `${base} border-line bg-surface`;
}

export function Dashboard() {
  const tasks = useProgress((s) => s.tasks);
  const theoryRead = useProgress((s) => s.theoryRead);
  const last = useProgress((s) => s.last);
  const data = { tasks, theoryRead };
  const stats = courseStats(course, data);
  const first = course.lessons[0];
  const continueTo = last ?? (first ? { path: lessonPath(first), title: '' } : null);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <section className="page relative px-6 py-7 lg:px-10 lg:py-9">
        <div className="hand text-[1.6rem]">Zero → Trainee QA Automation</div>
        <h1 className="mt-1 max-w-3xl font-display text-[2rem] font-bold leading-tight lg:text-[2.6rem]">
          From zero to <span className="marker">Trainee QA Automation</span> Engineer
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Manual testing fundamentals, tech basics, TypeScript and Playwright — theory, curated resources and practice tasks that are checked
          automatically.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {continueTo && (
            <Link to={continueTo.path} className="btn btn-primary max-w-full whitespace-normal text-left">
              {continueTo.title ? `Continue: ${continueTo.title}` : 'Start learning'} →
            </Link>
          )}
          <Link to="/playground" className="btn btn-secondary">
            🐞 Bug Playground
          </Link>
          <span className="hand text-[1.4rem]">{heroNote(stats.lessonsCompleted, stats.lessonsTotal)}</span>
        </div>
        <div className="mt-7 grid max-w-2xl grid-cols-3 gap-3">
          <Stat label="Lessons completed" value={`${stats.lessonsCompleted}/${stats.lessonsTotal}`} />
          <Stat label="Tasks solved" value={`${stats.tasksSolved}/${stats.tasksTotal}`} />
          <Stat label="Course progress" value={`${stats.percent}%`} />
        </div>
      </section>

      <h2 className="mt-12 font-display text-2xl font-bold">
        Course <span className="marker">map</span>
      </h2>
      {course.tracks.map((track, i) => (
        <section key={track.id} className={`mt-7 ${trackClass(i)}`}>
          <div className="flex flex-wrap items-end gap-x-4 border-b-2 border-track">
            <span className="track-tab">
              {formatModuleNumber(i + 1)} · {track.title}
            </span>
            {track.description && <p className="hidden pb-1 text-sm text-muted md:block">{track.description}</p>}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {track.modules.map((m) => (
              <ModuleCard key={m.slug} module={m} data={data} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ModuleCard({ module: m, data }: { module: CourseModule; data: ProgressInput }) {
  const ms = moduleStats(m, data);
  const stamp = moduleStamp(m, ms);
  const done = ms.percent === FULL_PERCENT;
  return (
    <Link
      to={`/module/${m.slug}`}
      className={`card group flex flex-col border-t-4 border-t-track p-4 transition-colors hover:bg-hover ${m.available ? '' : 'opacity-60'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-display text-[1.7rem] font-bold leading-none text-track">{formatModuleNumber(m.number)}</span>
        {stamp && <span className={`font-hand text-[1.25rem] font-bold leading-none ${stamp.className}`}>{stamp.text}</span>}
      </div>
      <div className="mt-2 font-bold leading-snug group-hover:text-accent-fg">{m.title}</div>
      <div className="mt-3 flex flex-wrap gap-1" aria-hidden="true">
        {m.planned.map((p) => (
          <span key={p.number} className={tickClass(p, data)} />
        ))}
      </div>
      {m.available && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          <ProgressBar percent={ms.percent} tone={done ? 'ok' : 'accent'} />
          <span className="shrink-0 tabular-nums">
            {ms.completed}/{ms.total}
          </span>
        </div>
      )}
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line border-l-4 border-l-highlight bg-sunken px-3 py-2.5">
      <div className="font-display text-xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
