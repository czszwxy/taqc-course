import { Link } from 'react-router-dom';
import { course, lessonPath } from '../content/loader';
import { useProgress } from '../features/progress/store';
import { courseStats, moduleStats } from '../features/progress/selectors';
import { ProgressBar } from '../components/ui';

export function Dashboard() {
  const tasks = useProgress((s) => s.tasks);
  const theoryRead = useProgress((s) => s.theoryRead);
  const last = useProgress((s) => s.last);
  const data = { tasks, theoryRead };
  const stats = courseStats(course, data);
  const first = course.lessons[0];
  const availableModules = course.modules.filter((m) => m.available).length;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
      <section className="card relative overflow-hidden p-6 lg:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative">
          <div className="chip chip-accent mb-3">Self-study course</div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">From zero to Trainee QA Automation Engineer</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Manual testing fundamentals, tech basics, TypeScript and Playwright — theory, curated resources and practice tasks that
            are checked automatically.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {last ? (
              <Link to={last.path} className="btn btn-primary">
                Continue: {last.title} →
              </Link>
            ) : (
              first && (
                <Link to={lessonPath(first)} className="btn btn-primary">
                  Start learning →
                </Link>
              )
            )}
            <Link to="/playground" className="btn btn-secondary">
              🐞 Bug Playground
            </Link>
          </div>
          <div className="mt-6 grid max-w-2xl grid-cols-3 gap-3">
            <Stat label="Lessons completed" value={`${stats.lessonsCompleted}/${stats.lessonsTotal}`} />
            <Stat label="Tasks solved" value={`${stats.tasksSolved}/${stats.tasksTotal}`} />
            <Stat label="Modules available" value={`${availableModules}/${course.modules.length}`} />
          </div>
        </div>
      </section>

      {course.tracks.map((track) => (
        <section key={track.id} className="mt-10">
          <h2 className="text-xs font-bold uppercase tracking-wider text-faint">{track.title}</h2>
          {track.description && <p className="mt-1 text-sm text-muted">{track.description}</p>}
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {track.modules.map((m) => {
              const ms = moduleStats(m, data);
              return (
                <Link
                  key={m.slug}
                  to={`/module/${m.slug}`}
                  className={`card group flex flex-col p-4 transition-colors hover:border-accent/60 ${m.available ? '' : 'opacity-60'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold tabular-nums text-faint">Module {String(m.number).padStart(2, '0')}</span>
                    {m.available ? (
                      ms.completed === ms.total && ms.total > 0 ? (
                        <span className="chip chip-ok">Done</span>
                      ) : ms.started ? (
                        <span className="chip chip-accent">In progress</span>
                      ) : null
                    ) : (
                      <span className="chip">Coming soon</span>
                    )}
                  </div>
                  <div className="mt-1 font-semibold group-hover:text-accent-fg">{m.title}</div>
                  <div className="mt-1 text-xs text-muted">
                    {m.available ? `${m.lessons.length} of ${m.planned.length} lessons ready` : `${m.planned.length} lessons planned`}
                  </div>
                  {m.available && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                      <ProgressBar percent={ms.percent} tone={ms.percent === 100 ? 'ok' : 'accent'} />
                      <span className="tabular-nums">{ms.percent}%</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-sunken px-3 py-2.5">
      <div className="text-lg font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
