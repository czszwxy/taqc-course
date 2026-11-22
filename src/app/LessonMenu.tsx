import { Link, NavLink, useParams } from 'react-router-dom';
import { coursePath, lessonPath, type Course, type CourseModule } from '../content/loader';
import { useProgress } from '../features/progress/store';
import { TrackTab, trackClass } from '../components/ui';
import { formatModuleNumber } from '../lib/format';
import { trackIndexOf } from './tracks';
import { LINE, LINE_UNBUILT, Rail, STATE_LABEL, StationMarker, lessonState, linePosition } from './RouteMap';

function lessonLinkClass({ isActive }: { isActive: boolean }): string {
  const state = isActive ? 'bg-highlight font-bold text-highlight-fg' : 'text-fg hover:bg-hover';
  return `flex min-w-0 flex-1 items-center rounded-md px-2 py-1.5 ${state}`;
}

/** The current module's lessons — its stretch of the course line, one stop per lesson. Shown next to lesson pages. */
export function LessonMenu({ course, module: m }: { course: Course; module: CourseModule }) {
  const tasks = useProgress((s) => s.tasks);
  const theoryRead = useProgress((s) => s.theoryRead);
  const { moduleSlug, lessonSlug } = useParams();
  const data = { tasks, theoryRead };
  const here = `${moduleSlug}/${lessonSlug}`;
  const trackIndex = trackIndexOf(course, m.slug);

  return (
    <nav aria-label="Lessons in this module" className="text-[14px]">
      <TrackTab index={trackIndex}>Module {formatModuleNumber(m.number)}</TrackTab>
      <div className="page rounded-tl-none p-3">
        <Link to={`/module/${m.slug}`} className="block px-2 font-display text-[1.05rem] font-bold leading-snug hover:text-accent-fg">
          {m.title}
        </Link>
        <ol className={`mt-2 ${trackClass(trackIndex)}`}>
          {m.planned.map((p, i) => {
            const state = lessonState(p, data, here);
            // Spoken from progress alone: the current lesson is announced as the current page by NavLink.
            const spoken = STATE_LABEL[lessonState(p, data, undefined)];
            return (
              <li key={p.number} className="flex">
                <Rail size="compact" line={`${linePosition(i, m.planned.length, 'compact')} ${p.lesson ? LINE : LINE_UNBUILT}`}>
                  <StationMarker size="compact" state={state} />
                </Rail>
                {p.lesson ? (
                  <NavLink to={lessonPath(p.lesson)} className={lessonLinkClass}>
                    <span className="min-w-0 flex-1 truncate">{p.lesson.title}</span>
                    {spoken && <span className="sr-only">, {spoken}</span>}
                  </NavLink>
                ) : (
                  <span className="min-w-0 flex-1 truncate px-2 py-1.5 text-faint" title="Coming soon">
                    {p.title}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        <Link to={coursePath(course)} className="mt-3 block border-t border-dashed border-line px-2 pt-2 text-xs font-bold text-muted hover:text-fg">
          ← {course.icon} {course.title} map
        </Link>
      </div>
    </nav>
  );
}
