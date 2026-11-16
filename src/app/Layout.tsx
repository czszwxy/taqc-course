import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { catalog } from '../content/loader';
import { useProgress, useSettings } from '../features/progress/store';
import { courseStats } from '../features/progress/selectors';
import { useAutoSync, useSync } from '../features/sync/sync';
import { useCurrentCourse } from './currentCourse';

const MAX_SHOWN_ERRORS = 8;
/** Routes that belong to one course: only there the top bar shows that course's lesson counter. */
const COURSE_ROUTE_PREFIXES = ['/course/', '/module/', '/learn/'];

function navClass({ isActive }: { isActive: boolean }): string {
  const state = isActive ? 'bg-highlight text-highlight-fg' : 'text-muted hover:bg-hover hover:text-fg';
  return `inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-bold transition-colors ${state}`;
}

/** App chrome: a notebook-style top bar (no sidebar). Lesson pages add their own module menu. */
export function Layout() {
  const { theme, toggleTheme } = useSettings();
  const tasks = useProgress((s) => s.tasks);
  const theoryRead = useProgress((s) => s.theoryRead);
  const current = useCurrentCourse();
  const { pathname } = useLocation();
  const inCourse = COURSE_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const stats = current && inCourse ? courseStats(current, { tasks, theoryRead }) : undefined;
  useAutoSync();
  const syncFailed = useSync((s) => s.status === 'error' && Boolean(s.token));

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b-2 border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-4 lg:px-8">
          <Link to="/" className="mr-2 shrink-0 font-display text-[1.25rem] font-bold leading-none sm:mr-4" title="All professions">
            my-<span className="marker">university</span>
          </Link>
          <nav className="flex min-w-0 items-center gap-1" aria-label="Main">
            <NavLink to="/" end className={navClass} title="All professions">
              <span aria-hidden="true">🎓</span>
              <span className="hidden md:inline">Courses</span>
            </NavLink>
            <NavLink to="/playground" className={navClass} title="Bug Playground">
              <span aria-hidden="true">🐞</span>
              <span className="hidden md:inline">Bug Playground</span>
            </NavLink>
          </nav>
          <div className="flex-1" />
          {stats && (
            <span className="mr-2 hidden text-sm text-muted lg:inline" title={`Lessons completed in ${current?.title}`}>
              <span className="font-bold tabular-nums text-fg">
                {stats.lessonsCompleted}/{stats.lessonsTotal}
              </span>{' '}
              lessons
            </span>
          )}
          <button
            className="btn btn-ghost btn-sm"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Switch to paper (light) theme' : 'Switch to blueprint (dark) theme'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <NavLink to="/settings" className={navClass} aria-label="Settings" title={syncFailed ? 'Sync problem — open Settings' : 'Settings & progress'}>
            <span className="relative">
              ⚙️
              {syncFailed && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-bad" aria-hidden="true" />}
            </span>
          </NavLink>
        </div>
      </header>

      {catalog.errors.length > 0 && (
        <div className="border-b border-bad/30 bg-bad-soft px-4 py-2 text-xs text-bad">
          <strong>Content errors ({catalog.errors.length}):</strong>
          <ul className="mt-1 list-disc pl-5">
            {catalog.errors.slice(0, MAX_SHOWN_ERRORS).map((e) => (
              <li key={e} className="font-mono">
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      <main id="main" className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
