import { Link } from 'react-router-dom';
import { catalog, coursePath, type Course } from '../content/loader';
import type { CourseStatus } from '../content/schema';
import { useProgress } from '../features/progress/store';
import { courseStats } from '../features/progress/selectors';
import { ProgressBar, trackClass } from '../components/ui';
import { useCurrentCourse } from '../app/currentCourse';

type ProgressInput = Parameters<typeof courseStats>[1];

const STATUS: Record<CourseStatus, { stamp: string; className: string; cta: string }> = {
  available: { stamp: 'ready', className: 'text-ok', cta: 'Open course →' },
  'in-progress': { stamp: 'growing', className: 'text-accent-fg', cta: 'Open course →' },
  planned: { stamp: 'coming soon', className: 'text-faint', cta: 'See the plan →' },
};

/** Main menu: the catalog of professions. */
export function CatalogPage() {
  const tasks = useProgress((s) => s.tasks);
  const theoryRead = useProgress((s) => s.theoryRead);
  const data = { tasks, theoryRead };
  const current = useCurrentCourse();
  const currentStarted = current ? courseStats(current, data).percent > 0 : false;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <section className="page px-6 py-7 lg:px-10 lg:py-9">
        <div className="hand text-[1.6rem]">your own university — pick a profession</div>
        <h1 className="mt-1 max-w-3xl font-display text-[2rem] font-bold leading-tight lg:text-[2.6rem]">
          From zero to your <span className="marker">first job in IT</span>
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Self-study courses with theory, practice that is checked automatically, real tools and a portfolio project. Modules that several
          professions share — testing basics, Git, SQL, HTTP, getting hired — are written once and your progress in them counts in every course that
          uses them.
        </p>
        {current && currentStarted && (
          <Link to={coursePath(current)} className="btn btn-primary mt-6 max-w-full whitespace-normal text-left">
            Continue: {current.title} ({current.subtitle}) →
          </Link>
        )}
      </section>

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

function CourseCard({ course, index, data }: { course: Course; index: number; data: ProgressInput }) {
  const stats = courseStats(course, data);
  const modulesReady = course.modules.filter((m) => m.available).length;
  const status = STATUS[course.status];
  return (
    <Link to={coursePath(course)} className={`card group flex flex-col border-t-4 border-t-track p-5 transition-colors hover:bg-hover ${trackClass(index)}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[2.2rem] leading-none" aria-hidden="true">
          {course.icon}
        </span>
        <span className={`font-hand text-[1.3rem] font-bold leading-none ${status.className}`}>{status.stamp}</span>
      </div>
      <h3 className="mt-3 font-display text-xl font-bold leading-snug group-hover:text-accent-fg">{course.title}</h3>
      <div className="text-sm font-bold text-track">{course.subtitle}</div>
      <p className="mt-2 line-clamp-4 flex-1 text-sm text-muted">{course.description}</p>
      <div className="mt-4 text-xs text-muted">
        {modulesReady}/{course.modules.length} modules ready · {course.lessons.length} lessons
      </div>
      {stats.percent > 0 && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted">
          <ProgressBar percent={stats.percent} />
          <span className="shrink-0 tabular-nums">{stats.percent}%</span>
        </div>
      )}
      <span className="btn btn-secondary btn-sm mt-4 self-start">{status.cta}</span>
    </Link>
  );
}
