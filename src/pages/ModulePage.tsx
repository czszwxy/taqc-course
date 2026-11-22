import { Link, useParams } from 'react-router-dom';
import { coursePath, lessonPath, type CourseModule } from '../content/loader';
import { useProgress } from '../features/progress/store';
import { lessonStats, moduleStats } from '../features/progress/selectors';
import { ProgressBar, TrackTab, trackClass } from '../components/ui';
import { formatModuleNumber } from '../lib/format';
import { trackIndexOf } from '../app/tracks';
import { useCourseForModule } from '../app/currentCourse';
import { HereLabel, LINE, LINE_UNBUILT, Rail, StationMarker, type StationState } from '../app/RouteMap';
import { NotFound } from './NotFound';

type ProgressInput = Parameters<typeof moduleStats>[1];
type PlannedLesson = CourseModule['planned'][number];

const FULL_PERCENT = 100;
const LEARN_PREFIX = '/learn/';

/** The lesson the learner is in: the last visited one in this module, otherwise the first unfinished one. */
function hereLessonId(m: CourseModule, data: ProgressInput, lastPath: string | undefined): string | undefined {
  const path = (lastPath ?? '').split('?')[0] ?? '';
  const [moduleSlug, lessonSlug] = path.startsWith(LEARN_PREFIX) ? path.slice(LEARN_PREFIX.length).split('/') : [];
  if (moduleSlug === m.slug && lessonSlug) return `${moduleSlug}/${lessonSlug}`;
  return m.lessons.find((l) => !lessonStats(l, data).complete)?.id;
}

function lessonState(p: PlannedLesson, data: ProgressInput, here: string | undefined): StationState {
  if (!p.lesson) return 'soon';
  if (p.lesson.id === here) return 'here';
  const s = lessonStats(p.lesson, data);
  if (s.complete) return 'done';
  if (s.started) return 'started';
  return 'ahead';
}

/** Where the piece of line sits in a row: the line starts at the first stop and ends at the last one. */
function linePosition(index: number, count: number): string {
  if (count === 1) return 'hidden';
  if (index === 0) return 'top-7 bottom-0';
  if (index === count - 1) return 'top-0 h-7';
  return 'inset-y-0';
}

function TaskCount({ stats }: { stats: { solved: number; required: number } }) {
  return (
    <div>
      {stats.solved}/{stats.required} tasks
    </div>
  );
}

export function ModulePage() {
  const { moduleSlug } = useParams();
  const tasks = useProgress((s) => s.tasks);
  const theoryRead = useProgress((s) => s.theoryRead);
  const last = useProgress((s) => s.last);
  const course = useCourseForModule(moduleSlug);
  const m = moduleSlug ? course?.modulesBySlug.get(moduleSlug) : undefined;
  if (!course || !m) return <NotFound />;
  const data = { tasks, theoryRead };
  const ms = moduleStats(m, data);
  const trackIndex = trackIndexOf(course, m.slug);
  const here = hereLessonId(m, data, last?.path);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
      <Link to={coursePath(course)} className="text-xs font-bold text-muted hover:text-fg">
        ← {course.icon} {course.title} map
      </Link>
      <div className="mt-4">
        <TrackTab index={trackIndex}>
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
      {/* The same line as on the course map: this module's stretch of it, one stop per lesson. */}
      <ol className={`page mt-3 px-2 py-2 sm:px-4 ${trackClass(trackIndex)}`} aria-label="Lessons in this module">
        {m.planned.map((p, i) => {
          const state = lessonState(p, data, here);
          return (
            <li key={p.number} className="flex">
              <Rail line={`${linePosition(i, m.planned.length)} ${p.lesson ? LINE : LINE_UNBUILT}`}>
                <StationMarker state={state} />
              </Rail>
              {p.lesson ? (
                <Link to={lessonPath(p.lesson)} className="group my-0.5 flex min-w-0 flex-1 items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-hover">
                  <span className="w-7 shrink-0 font-display text-lg font-bold tabular-nums text-track">{p.number}</span>
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 leading-snug">
                      <span className="font-bold group-hover:text-accent-fg">{p.lesson.title}</span>
                      {state === 'here' && <HereLabel />}
                    </div>
                    <div className="mt-0.5 text-sm text-muted">{p.lesson.summary}</div>
                  </div>
                  <div className="hidden shrink-0 pt-1 text-right text-xs text-muted sm:block">
                    <div>{p.lesson.minutes} min</div>
                    <TaskCount stats={lessonStats(p.lesson, data)} />
                  </div>
                </Link>
              ) : (
                <div className="my-0.5 flex min-w-0 flex-1 items-start gap-3 px-3 py-3 text-faint">
                  <span className="w-7 shrink-0 font-display text-lg font-bold tabular-nums">{p.number}</span>
                  <span className="min-w-0 flex-1 font-bold leading-7">{p.title}</span>
                  <span className="shrink-0 pt-1 text-xs">coming soon</span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
