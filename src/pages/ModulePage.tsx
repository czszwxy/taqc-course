import { Link, useParams } from 'react-router-dom';
import { coursePath, lessonPath } from '../content/loader';
import { useProgress } from '../features/progress/store';
import { lessonStats, moduleStats } from '../features/progress/selectors';
import { ProgressBar, StatusIcon, TrackTab, lessonIconStatus } from '../components/ui';
import { formatModuleNumber } from '../lib/format';
import { trackIndexOf } from '../app/tracks';
import { useCourseForModule } from '../app/currentCourse';
import { NotFound } from './NotFound';

const FULL_PERCENT = 100;
const ROW_ICON_SIZE = 18;

export function ModulePage() {
  const { moduleSlug } = useParams();
  const tasks = useProgress((s) => s.tasks);
  const theoryRead = useProgress((s) => s.theoryRead);
  const course = useCourseForModule(moduleSlug);
  const m = moduleSlug ? course?.modulesBySlug.get(moduleSlug) : undefined;
  if (!course || !m) return <NotFound />;
  const data = { tasks, theoryRead };
  const ms = moduleStats(m, data);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
      <Link to={coursePath(course)} className="text-xs font-bold text-muted hover:text-fg">
        ← {course.icon} {course.title} map
      </Link>
      <div className="mt-4">
        <TrackTab index={trackIndexOf(course, m.slug)}>
          {m.trackTitle} · Module {formatModuleNumber(m.number)}
        </TrackTab>
      </div>
      <section className="page rounded-tl-none px-6 py-6 lg:px-8">
        <h1 className="font-display text-[1.9rem] font-bold leading-tight">{m.title}</h1>
        {m.description && <p className="mt-2 text-muted">{m.description}</p>}

        {m.available && (
          <div className="mt-4 flex max-w-md items-center gap-3 text-sm text-muted">
            <ProgressBar percent={ms.percent} tone={ms.percent === FULL_PERCENT ? 'ok' : 'accent'} />
            <span className="shrink-0 tabular-nums">
              {ms.completed}/{ms.total} lessons
            </span>
          </div>
        )}

        {m.goals.length > 0 && (
          <div className="mt-6 rounded-lg border border-line bg-sunken p-5">
            <h2 className="font-hand text-[1.5rem] font-bold leading-none text-pen">After this module you will be able to</h2>
            <ul className="mt-3 space-y-1.5 text-[15px]">
              {m.goals.map((g) => (
                <li key={g} className="flex gap-2">
                  <span className="font-bold text-ok">☑</span>
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <h2 className="mt-9 font-display text-xl font-bold">
        <span className="marker">Lessons</span>
      </h2>
      <div className="page mt-3 divide-y divide-dashed divide-line">
        {m.planned.map((p) => {
          if (!p.lesson) {
            return (
              <div key={p.number} className="flex items-center gap-3 px-4 py-3 text-sm text-faint">
                <span className="w-6 font-display font-bold tabular-nums">{p.number}</span>
                <span className="flex-1">{p.title}</span>
                <span className="chip">Coming soon</span>
              </div>
            );
          }
          const s = lessonStats(p.lesson, data);
          return (
            <Link key={p.number} to={lessonPath(p.lesson)} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-hover">
              <StatusIcon status={lessonIconStatus(s)} size={ROW_ICON_SIZE} />
              <span className="w-6 font-display font-bold tabular-nums text-faint">{p.number}</span>
              <div className="min-w-0 flex-1">
                <div className="font-bold group-hover:text-accent-fg">{p.lesson.title}</div>
                <div className="mt-0.5 truncate text-xs text-muted">{p.lesson.summary}</div>
              </div>
              <div className="hidden shrink-0 text-right text-xs text-muted sm:block">
                <div>{p.lesson.minutes} min</div>
                <div>
                  {s.solved}/{s.required} tasks
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
