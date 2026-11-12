import { Link, NavLink } from 'react-router-dom';
import { coursePath, lessonPath, type Course, type CourseModule } from '../content/loader';
import { useProgress } from '../features/progress/store';
import { lessonStats } from '../features/progress/selectors';
import { StatusIcon, TrackTab, lessonIconStatus } from '../components/ui';
import { formatModuleNumber } from '../lib/format';
import { trackIndexOf } from './tracks';

const ICON_SIZE = 16;

function lessonLinkClass({ isActive }: { isActive: boolean }): string {
  const state = isActive ? 'bg-highlight font-bold text-highlight-fg' : 'text-fg hover:bg-hover';
  return `flex items-center gap-2 rounded-md px-2 py-1.5 ${state}`;
}

/** The current module's lessons — a notebook tab with a checklist. Shown next to lesson pages. */
export function LessonMenu({ course, module: m }: { course: Course; module: CourseModule }) {
  const tasks = useProgress((s) => s.tasks);
  const theoryRead = useProgress((s) => s.theoryRead);
  const data = { tasks, theoryRead };

  return (
    <nav aria-label="Lessons in this module" className="text-[14px]">
      <TrackTab index={trackIndexOf(course, m.slug)}>Module {formatModuleNumber(m.number)}</TrackTab>
      <div className="page rounded-tl-none p-3">
        <Link to={`/module/${m.slug}`} className="block px-2 font-display text-[1.05rem] font-bold leading-snug hover:text-accent-fg">
          {m.title}
        </Link>
        <ol className="mt-2 space-y-0.5">
          {m.planned.map((p) => {
            if (!p.lesson) {
              return (
                <li key={p.number} className="flex items-center gap-2 px-2 py-1.5 text-faint" title="Coming soon">
                  <span className="inline-block h-4 w-4 shrink-0 rounded-[3px] border border-dashed border-line" />
                  <span className="min-w-0 flex-1 truncate">{p.title}</span>
                </li>
              );
            }
            const status = lessonIconStatus(lessonStats(p.lesson, data));
            return (
              <li key={p.number}>
                <NavLink to={lessonPath(p.lesson)} className={lessonLinkClass}>
                  <StatusIcon status={status} size={ICON_SIZE} />
                  <span className="min-w-0 flex-1 truncate">{p.lesson.title}</span>
                </NavLink>
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
