import { Link } from 'react-router-dom';
import { PLAYGROUND_PAGES } from '../playground/registry';

export function PlaygroundIndex() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-8 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight">🐞 Bug Playground</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Small demo pages with <b>intentional bugs</b>. Practice tasks send you here to explore, write test cases and file bug reports. Later, in
        the automation modules, you will write Playwright tests that catch these same bugs.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {PLAYGROUND_PAGES.map((p) => (
          <div key={p.id} className="card flex flex-col p-5">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{p.title}</div>
              <span className="chip chip-bad">{p.bugs} hidden bugs</span>
            </div>
            <p className="mt-1 flex-1 text-sm text-muted">{p.description}</p>
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
        <div className="flex items-center justify-center rounded-xl border border-dashed border-line p-5 text-center text-sm text-faint">
          More pages (cart, search & filters, order status, login) arrive with the QA Practice Lab module.
        </div>
      </div>
    </div>
  );
}
