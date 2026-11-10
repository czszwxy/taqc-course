import { Link, useParams } from 'react-router-dom';
import { course, lessonPath } from '../content/loader';
import { useProgress } from '../features/progress/store';
import { lessonStats, moduleStats } from '../features/progress/selectors';
import { ProgressBar, StatusIcon } from '../components/ui';
import { NotFound } from './NotFound';

export function ModulePage() {
  const { moduleSlug } = useParams();
  const tasks = useProgress((s) => s.tasks);
  const theoryRead = useProgress((s) => s.theoryRead);
  const m = moduleSlug ? course.modulesBySlug.get(moduleSlug) : undefined;
  if (!m) return <NotFound />;
  const data = { tasks, theoryRead };
  const ms = moduleStats(m, data);

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 lg:px-8">
      <div className="text-xs font-semibold uppercase tracking-wider text-faint">
        {m.trackTitle} · Module {String(m.number).padStart(2, '0')}
      </div>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">{m.title}</h1>
      {m.description && <p className="mt-2 text-muted">{m.description}</p>}

      {m.available && (
        <div className="mt-4 flex max-w-md items-center gap-3 text-sm text-muted">
          <ProgressBar percent={ms.percent} tone={ms.percent === 100 ? 'ok' : 'accent'} />
          <span className="shrink-0 tabular-nums">
            {ms.completed}/{ms.total} lessons
          </span>
        </div>
      )}

      {m.goals.length > 0 && (
        <div className="card mt-6 p-5">
          <h2 className="text-sm font-semibold">After this module you will be able to</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-muted">
            {m.goals.map((g) => (
              <li key={g} className="flex gap-2">
                <span className="text-ok">✓</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-faint">Lessons</h2>
      <div className="mt-3 space-y-2">
        {m.planned.map((p) => {
          if (!p.lesson) {
            return (
              <div key={p.number} className="flex items-center gap-3 rounded-xl border border-dashed border-line px-4 py-3 text-sm text-faint">
                <span className="w-6 tabular-nums">{p.number}</span>
                <span className="flex-1">{p.title}</span>
                <span className="chip">Coming soon</span>
              </div>
            );
          }
          const s = lessonStats(p.lesson, data);
          return (
            <Link key={p.number} to={lessonPath(p.lesson)} className="card flex items-center gap-3 px-4 py-3 transition-colors hover:border-accent/60">
              <span className="w-6 text-sm tabular-nums text-faint">{p.number}</span>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{p.lesson.title}</div>
                <div className="mt-0.5 truncate text-xs text-muted">{p.lesson.summary}</div>
              </div>
              <div className="hidden shrink-0 text-right text-xs text-muted sm:block">
                <div>{p.lesson.minutes} min</div>
                <div>
                  {s.solved}/{s.required} tasks
                </div>
              </div>
              <StatusIcon status={s.complete ? 'complete' : s.started ? 'started' : 'new'} size={18} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
