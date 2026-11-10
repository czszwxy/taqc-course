import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { course } from '../content/loader';
import { useSettings } from '../features/progress/store';

export function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useSettings();

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="flex h-full">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-76 shrink-0 border-r border-line bg-surface transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar />
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface/80 px-4 backdrop-blur">
          <button className="btn btn-ghost btn-sm lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            ☰
          </button>
          <Link to="/" className="font-semibold lg:hidden">
            QA Academy
          </Link>
          <div className="flex-1" />
          <Link to="/playground" className="btn btn-ghost btn-sm">
            🐞 Bug Playground
          </Link>
          <button className="btn btn-ghost btn-sm" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle dark mode">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <Link to="/settings" className="btn btn-ghost btn-sm" aria-label="Settings" title="Settings & progress">
            ⚙️
          </Link>
        </header>

        {course.errors.length > 0 && (
          <div className="border-b border-bad/30 bg-bad-soft px-4 py-2 text-xs text-bad">
            <strong>Content errors ({course.errors.length}):</strong>
            <ul className="mt-1 list-disc pl-5">
              {course.errors.slice(0, 8).map((e) => (
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
    </div>
  );
}
