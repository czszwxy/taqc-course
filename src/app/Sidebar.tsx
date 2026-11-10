import { useEffect, useState } from 'react';
import { Link, NavLink, matchPath, useLocation } from 'react-router-dom';
import { course, lessonPath } from '../content/loader';
import { useProgress } from '../features/progress/store';
import { courseStats, lessonStats, moduleStats } from '../features/progress/selectors';
import { ProgressBar, StatusIcon } from '../components/ui';
import { formatModuleNumber } from '../lib/format';

function lessonIconStatus(s: { complete: boolean; started: boolean }): 'complete' | 'started' | 'new' {
  if (s.complete) return 'complete';
  if (s.started) return 'started';
  return 'new';
}

export function Sidebar() {
  const location = useLocation();
  const tasks = useProgress((s) => s.tasks);
  const theoryRead = useProgress((s) => s.theoryRead);
  const data = { tasks, theoryRead };

  const match = matchPath('/learn/:moduleSlug/*', location.pathname) ?? matchPath('/module/:moduleSlug', location.pathname);
  const currentModule = match?.params.moduleSlug;

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(currentModule ? [currentModule] : []));
  useEffect(() => {
    if (currentModule) setExpanded((prev) => (prev.has(currentModule) ? prev : new Set(prev).add(currentModule)));
  }, [currentModule]);

  const toggle = (slug: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  const stats = courseStats(course, data);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-4 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="h-7 w-7" />
          <div>
            <div className="text-sm font-bold leading-tight">QA Academy</div>
            <div className="text-xs text-faint">Zero → Trainee QA Automation</div>
          </div>
        </Link>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          <ProgressBar percent={stats.percent} />
          <span className="shrink-0 tabular-nums">{stats.percent}%</span>
        </div>
      </div>

      <nav className="scroll-thin flex-1 overflow-y-auto px-2 py-3 text-[14.5px]">
        {course.tracks.map((track) => (
          <div key={track.id} className="mb-4">
            <div className="px-2 pb-1.5 text-[11.5px] font-bold uppercase tracking-wider text-faint">{track.title}</div>
            {track.modules.map((m) => {
              const isOpen = expanded.has(m.slug);
              const ms = moduleStats(m, data);
              return (
                <div key={m.slug}>
                  <button
                    onClick={() => toggle(m.slug)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-hover ${
                      m.available || currentModule === m.slug ? 'text-fg' : 'text-muted'
                    }`}
                  >
                    <span className="w-5 shrink-0 text-xs tabular-nums text-faint">
                      {formatModuleNumber(m.number)}
                    </span>
                    <span className={`min-w-0 flex-1 truncate ${m.available ? 'font-semibold' : 'font-medium'}`}>{m.title}</span>
                    {m.available ? (
                      ms.percent > 0 && <span className="text-xs tabular-nums text-muted">{ms.percent}%</span>
                    ) : (
                      <span className="text-[10.5px] font-semibold uppercase tracking-wide text-faint">soon</span>
                    )}
                    <span className={`text-[10px] text-faint transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                  </button>
                  {isOpen && (
                    <div className="mb-1 ml-4 border-l border-line pl-2">
                      <Link to={`/module/${m.slug}`} className="block rounded-md px-2 py-1 text-[13px] text-muted hover:bg-hover hover:text-fg">
                        Module overview
                      </Link>
                      {m.planned.map((p) =>
                        p.lesson ? (
                          <NavLink
                            key={p.number}
                            to={lessonPath(p.lesson)}
                            className={({ isActive }) =>
                              `flex items-center gap-2 rounded-md px-2 py-1.5 text-[14px] ${
                                isActive || location.pathname.startsWith(lessonPath(p.lesson!) + '/')
                                  ? 'bg-accent-soft font-medium text-accent-fg'
                                  : 'text-fg/90 hover:bg-hover'
                              }`
                            }
                          >
                            <LessonIcon lessonId={p.lesson.id} data={data} />
                            <span className="min-w-0 flex-1 truncate">{p.lesson.title}</span>
                          </NavLink>
                        ) : (
                          <div key={p.number} className="flex items-center gap-2 px-2 py-1.5 text-[14px] text-faint" title="Coming soon">
                            <span className="inline-block h-4 w-4 shrink-0 rounded-full border border-dashed border-line" />
                            <span className="min-w-0 flex-1 truncate">{p.title}</span>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );
}

function LessonIcon({ lessonId, data }: { lessonId: string; data: Parameters<typeof lessonStats>[1] }) {
  const lesson = course.lessonsById.get(lessonId);
  if (!lesson) return null;
  const s = lessonStats(lesson, data);
  return <StatusIcon status={lessonIconStatus(s)} size={16} />;
}
