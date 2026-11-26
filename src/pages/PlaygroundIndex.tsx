import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { PLAYGROUND_PAGES } from '../playground/registry';
import { Icon } from '../components/icons';

const BUG_ICON_SIZE = 14;
const TOTAL_BUGS = PLAYGROUND_PAGES.reduce((sum, p) => sum + p.bugs, 0);

export function PlaygroundIndex() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-8 lg:px-8">
      <div className="hand text-[1.5rem]">
        {TOTAL_BUGS} bugs are hiding on {PLAYGROUND_PAGES.length} pages — find them!
      </div>
      <h1 className="font-display text-[1.9rem] font-bold">
        Bug <span className="marker">Playground</span>
      </h1>
      <p className="mt-2 max-w-2xl text-muted">
        Small demo pages with <b>intentional bugs</b>. Practice tasks (mostly in the QA Practice Lab module) send you here to explore, write test cases and file bug reports. Later, in
        the automation modules, you will write Playwright tests that catch these same bugs.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {PLAYGROUND_PAGES.map((p, i) => (
          <div key={p.id} className="card rise lift bug-card flex flex-col p-5" style={{ '--i': i } as CSSProperties}>
            <div className="font-display text-lg font-bold">{p.title}</div>
            <p className="mt-1 flex-1 text-sm text-muted">{p.description}</p>
            {/* One ink bug per hidden bug, like the mini route on the profession cards. */}
            <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="bug-row flex gap-0.5 text-pen" aria-hidden="true">
                {p.bugIds.map((id, j) => (
                  <span key={id} className="inline-flex" style={{ '--j': j } as CSSProperties}>
                    <Icon name="bug" size={BUG_ICON_SIZE} />
                  </span>
                ))}
              </span>
              <span className="text-xs font-bold text-muted">{p.bugs} hidden bugs</span>
            </div>
            <div className="mt-4 flex gap-2">
              <Link to={p.path} target="_blank" className="btn btn-primary btn-sm">
                Open in new tab ↗
              </Link>
              <Link to={p.path} className="btn btn-secondary btn-sm">
                Open here
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
