import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCourse, lessonPath, type Course } from '../content/loader';
import { useProgress, useSettings } from '../features/progress/store';
import { courseStats, moduleStats } from '../features/progress/selectors';
import { Callout } from '../components/ui';
import { Icon } from '../components/icons';
import { RouteMap } from '../app/RouteMap';
import { learnPathParts } from '../app/currentCourse';
import { NotFound } from './NotFound';

type ProgressInput = Parameters<typeof moduleStats>[1];

function heroNote(done: number, total: number): string {
  if (total === 0) return 'this course is being written';
  // A no-break space keeps the arrow with its words when the note wraps next to the button on a phone.
  if (done === 0) return '← start here!';
  if (done === total) return 'all done — you are ready! 🎉';
  return `${done} of ${total} lessons done — keep going!`;
}

/** The last visited page, if it is a lesson or task of this course. */
function lastInCourse(course: Course, last: { path: string; title: string } | undefined): { path: string; title: string } | undefined {
  const { moduleSlug } = learnPathParts(last?.path);
  return moduleSlug && course.modulesBySlug.has(moduleSlug) ? last : undefined;
}

/** The module the learner is in: the last visited one in this course, otherwise the first unfinished one. */
function hereSlug(course: Course, data: ProgressInput, resume: { path: string } | undefined): string | undefined {
  const fromLast = learnPathParts(resume?.path).moduleSlug;
  if (fromLast) return fromLast;
  return course.modules.find((m) => m.available && moduleStats(m, data).completed < m.lessons.length)?.slug;
}

/** Course map of one profession: a route from the first module to "First job" (see RouteMap). */
export function CoursePage() {
  const { courseId } = useParams();
  const course = getCourse(courseId);
  const tasks = useProgress((s) => s.tasks);
  const theoryRead = useProgress((s) => s.theoryRead);
  const last = useProgress((s) => s.last);
  const setCurrentCourse = useSettings((s) => s.setCurrentCourse);

  useEffect(() => {
    if (course) setCurrentCourse(course.id);
  }, [course, setCurrentCourse]);

  if (!course) return <NotFound />;
  const data = { tasks, theoryRead };
  const stats = courseStats(course, data);
  const first = course.lessons[0];
  const resume = lastInCourse(course, last);
  const continueTo = resume ?? (first ? { path: lessonPath(first), title: '' } : undefined);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <Link to="/" className="text-xs font-bold text-muted hover:text-fg">
        ← All professions
      </Link>
      <section className="page relative mt-3 px-6 py-7 lg:px-10 lg:py-9">
        <div className="hand text-[1.6rem]">{course.tagline}</div>
        <h1 className="mt-1 max-w-3xl font-display text-[2rem] font-bold leading-tight lg:text-[2.6rem]">
          <span aria-hidden="true">{course.icon}</span> {course.title}
        </h1>
        <div className="mt-1 text-lg font-bold">
          <span className="marker">{course.subtitle}</span>
        </div>
        <p className="mt-3 max-w-2xl text-muted">{course.description}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {/* The note stays on the main button's line, so "← start here!" points at it, not at the next button. */}
          <div className="flex min-w-0 items-center gap-3">
            {continueTo && (
              <Link to={continueTo.path} className="btn btn-primary min-w-0 whitespace-normal text-left">
                {continueTo.title ? `Continue: ${continueTo.title}` : 'Start learning'} →
              </Link>
            )}
            <span className="hand min-w-0 text-[1.4rem]">{heroNote(stats.lessonsCompleted, stats.lessonsTotal)}</span>
          </div>
          <Link to="/playground" className="btn btn-secondary">
            <Icon name="bug" /> Bug Playground
          </Link>
        </div>
        <div className="mt-7 grid max-w-2xl grid-cols-3 gap-3">
          <Stat label="Lessons completed" value={`${stats.lessonsCompleted}/${stats.lessonsTotal}`} />
          <Stat label="Tasks solved" value={`${stats.tasksSolved}/${stats.tasksTotal}`} />
          <Stat label="Course progress" value={`${stats.percent}%`} />
        </div>
        {course.status !== 'available' && (
          <div className="mt-6 max-w-2xl">
            <Callout tone="warn" title="This course is still being written">
              Stations marked <b>coming soon</b> (on a dotted line) are in the plan. Ready modules can be studied right away — many are shared with other
              professions.
            </Callout>
          </div>
        )}
      </section>

      <h2 className="mt-12 font-display text-2xl font-bold">
        Course <span className="marker">map</span>
      </h2>
      <RouteMap course={course} data={data} here={hereSlug(course, data, resume)} />
    </div>
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
