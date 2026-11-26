import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { catalog, coursePath, type Course } from '../content/loader';
import type { CourseStatus } from '../content/schema';
import { useProgress } from '../features/progress/store';
import { courseStats, moduleStats } from '../features/progress/selectors';
import { trackClass } from '../components/ui';
import { useCurrentCourse } from '../app/currentCourse';
import { stationState, type StationState } from '../app/RouteMap';
import { Workdesk } from '../features/workdesk/Workdesk';

type ProgressInput = Parameters<typeof courseStats>[1];

const STATUS: Record<CourseStatus, { stamp: string; className: string }> = {
  available: { stamp: 'ready', className: 'text-ok' },
  'in-progress': { stamp: 'growing', className: 'text-accent-fg' },
  planned: { stamp: 'coming soon', className: 'text-faint' },
};

/** A module on the mini route: the same states as the stations of the course map ("you are here" is not shown). */
const ROUTE_DOT: Record<StationState, string> = {
  done: 'border-track bg-track',
  here: 'border-track bg-surface',
  started: 'border-track bg-track/35',
  ahead: 'border-track bg-surface',
  soon: 'border-dashed border-faint bg-surface',
};

/** The whole course as a short line: one dot per module and the "First job" terminal at the end. */
function MiniRoute({ course, data }: { course: Course; data: ProgressInput }) {
  return (
    <div className="relative mt-4 flex items-center justify-between gap-0.5" aria-hidden="true">
      <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-track/30" />
      {course.modules.map((m) => (
        <span key={m.slug} className={`relative h-2.5 w-2.5 shrink-0 rounded-full border-2 ${ROUTE_DOT[stationState(m, moduleStats(m, data), undefined)]}`} />
      ))}
      <span className="relative h-3.5 w-3.5 shrink-0 rounded-[3px] border-[3px] border-fg bg-surface" />
    </div>
  );
}

/** Main menu: the catalog of professions. */
export function CatalogPage() {
  const tasks = useProgress((s) => s.tasks);
  const theoryRead = useProgress((s) => s.theoryRead);
  const data = { tasks, theoryRead };
  const current = useCurrentCourse();
  // Once anything is done, the home screen is the learner's desk; before that, the welcome.
  const hasProgress = Object.keys(tasks).length > 0 || Object.keys(theoryRead).length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      {current && hasProgress ? <Workdesk course={current} /> : <Welcome />}

      <h2 className="mt-12 font-display text-2xl font-bold">
        <span className="marker">Professions</span>
      </h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {catalog.courses.map((c, i) => (
          <CourseCard key={c.id} course={c} index={i} data={data} />
        ))}
      </div>
    </div>
  );
}

/** Shown before the learner has done anything; afterwards the Workdesk takes its place. */
function Welcome() {
  return (
    <section className="page px-6 py-7 lg:px-10 lg:py-9">
      <div className="hand text-[1.6rem]">your own university — pick a profession</div>
      <h1 className="mt-1 max-w-3xl font-display text-[2rem] font-bold leading-tight lg:text-[2.6rem]">
        From zero to your <span className="marker">first job in IT</span>
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Self-study courses with theory, practice that is checked automatically, real tools and a portfolio project. Modules that several professions
        share — testing basics, Git, SQL, HTTP, getting hired — are written once and your progress in them counts in every course that uses them.
      </p>
    </section>
  );
}

function CourseCard({ course, index, data }: { course: Course; index: number; data: ProgressInput }) {
  const stats = courseStats(course, data);
  const modulesReady = course.modules.filter((m) => m.available).length;
  const status = STATUS[course.status];
  return (
    <Link
      to={coursePath(course)}
      style={{ '--i': index } as CSSProperties}
      className={`card rise lift group flex flex-col border-t-4 border-t-track p-5 transition-colors hover:bg-hover ${trackClass(index)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[2.2rem] leading-none" aria-hidden="true">
          {course.icon}
        </span>
        <span className={`font-hand text-[1.3rem] font-bold leading-none ${status.className}`}>{status.stamp}</span>
      </div>
      <h3 className="mt-3 font-display text-xl font-bold leading-snug group-hover:text-accent-fg">{course.title}</h3>
      <div className="text-sm font-bold text-track">{course.subtitle}</div>
      <p className="mt-2 line-clamp-4 flex-1 text-sm text-muted">{course.description}</p>
      <MiniRoute course={course} data={data} />
      <div className="mt-2 text-xs tabular-nums text-muted">
        {modulesReady}/{course.modules.length} modules ready · {course.lessons.length} lessons
        {stats.percent > 0 && ` · ${stats.percent}% done`}
      </div>
    </Link>
  );
}
