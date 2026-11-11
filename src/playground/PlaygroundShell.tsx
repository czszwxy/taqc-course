import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LAB_BUGS_KEY } from '../../server/lab-types';

/**
 * Shared chrome for Bug Playground pages: a fake product header, the page body and a yellow
 * "Requirements (for testers)" panel. Every page reads `?fixed` via `isFixedMode()` and turns its
 * intentional bugs off when it is present (the "good" build for future automation labs).
 */

export function isFixedMode(): boolean {
  return new URLSearchParams(window.location.search).has('fixed');
}

/*
 * Automation labs (module 15+): the Playwright lab runner puts LAB_BUGS_KEY into the localStorage of each
 * test's browser context — "none" turns every bug off, "<bugId>" (or a comma list) turns on only those.
 * It wins over `?fixed`. Never shown to the learner.
 */
function readLabBugs(): string | null {
  try {
    return window.localStorage.getItem(LAB_BUGS_KEY);
  } catch {
    return null;
  }
}

/** Applies the lab runner's bug selection (if any) on top of a page's bug flags. */
export function withLabMode<T extends Record<string, boolean>>(bugs: T): T {
  const lab = readLabBugs();
  if (lab === null) return bugs;
  const enabled = new Set(lab.split(','));
  return Object.fromEntries(Object.keys(bugs).map((id) => [id, enabled.has(id)])) as T;
}

export type Brand = 'taskly' | 'gadgetly';

const BRANDS: Record<Brand, { name: string; letter: string; badge: string; text: string }> = {
  taskly: { name: 'Taskly', letter: 'T', badge: 'bg-teal-600', text: 'text-teal-700' },
  gadgetly: { name: 'Gadgetly', letter: 'G', badge: 'bg-orange-500', text: 'text-orange-600' },
};

interface ShellProps {
  brand: Brand;
  fixed: boolean;
  /** `<li>` elements describing the expected behaviour. */
  requirements: ReactNode;
  onReset?: () => void;
  /** Title of the yellow side panel. */
  asideTitle?: string;
  /** Wider main column for tool-like pages (API console). */
  wide?: boolean;
  children: ReactNode;
}

export function PlaygroundShell({ brand, fixed, requirements, onReset, asideTitle = 'Requirements (for testers)', wide = false, children }: ShellProps) {
  const b = BRANDS[brand];
  return (
    <div className="min-h-full bg-slate-100 text-slate-900" style={{ colorScheme: 'light' }}>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <div className={`flex items-center gap-2 text-lg font-bold ${b.text}`}>
            <span className={`grid h-8 w-8 place-items-center rounded-lg text-white ${b.badge}`}>{b.letter}</span> {b.name}
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">demo app</span>
          </div>
          <Link to="/playground" className="text-sm text-slate-500 hover:text-slate-800">
            ← Back to QA Academy
          </Link>
        </div>
      </header>

      <main className={`mx-auto grid gap-6 px-5 py-8 lg:grid-cols-[1fr_340px] ${wide ? 'max-w-7xl' : 'max-w-6xl'}`}>
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">{children}</div>

        <aside className="h-fit rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm">
          <div className="font-semibold text-amber-900">📋 {asideTitle}</div>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-amber-950/80">{requirements}</ul>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              data-testid="reset-demo"
              className="mt-4 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
            >
              ↺ Reset demo data
            </button>
          )}
          {fixed && <div className="mt-3 rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-800">Fixed version (no intentional bugs)</div>}
        </aside>
      </main>
    </div>
  );
}

export function inputClass(hasError: boolean): string {
  const state = hasError ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white focus:border-teal-500';
  return `w-full rounded-md border px-3 py-2 text-[15px] outline-none focus:ring-2 focus:ring-teal-500/40 ${state}`;
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-sm text-red-600" data-testid={`error-${id}`}>
      {message}
    </p>
  );
}

export function PgField({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      <FieldError id={id} message={error} />
    </div>
  );
}

export function formatUah(amount: number): string {
  return `${amount.toLocaleString('en-US')} UAH`;
}
