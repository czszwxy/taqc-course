import type { ReactNode } from 'react';
import type { Status } from '../features/progress/selectors';

const FULL_PERCENT = 100;
const DEFAULT_ICON_SIZE = 16;

export function ProgressBar({ percent, className, tone = 'accent' }: { percent: number; className?: string; tone?: 'accent' | 'ok' }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full border border-line bg-sunken ${className ?? ''}`}>
      <div
        className={`h-full rounded-full transition-all ${tone === 'ok' ? 'bg-ok' : 'bg-accent'}`}
        style={{ width: `${Math.max(0, Math.min(FULL_PERCENT, percent))}%` }}
      />
    </div>
  );
}

export type IconStatus = Status | 'complete' | 'started' | 'new';

/** Icon status for a lesson from its stats. */
export function lessonIconStatus(s: { complete: boolean; started: boolean }): IconStatus {
  if (s.complete) return 'complete';
  if (s.started) return 'started';
  return 'new';
}

function iconKind(status: IconStatus): 'done' | 'started' | 'new' {
  if (status === 'solved' || status === 'complete') return 'done';
  if (status === 'attempted' || status === 'started') return 'started';
  return 'new';
}

/** Notebook checkbox: empty (new), half-filled (in progress), ticked (done). */
export function StatusIcon({ status, size = DEFAULT_ICON_SIZE }: { status: IconStatus; size?: number }) {
  const kind = iconKind(status);
  if (kind === 'done') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" className="shrink-0 text-ok" aria-label="done">
        <rect x="1" y="1" width="14" height="14" rx="3" fill="currentColor" />
        <path d="M4.3 8.4l2.4 2.4 5-5.4" fill="none" stroke="var(--c-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  const started = kind === 'started';
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={`shrink-0 ${started ? 'text-accent' : 'text-faint'}`} aria-label={started ? 'in progress' : 'not started'}>
      <rect x="1.8" y="1.8" width="12.4" height="12.4" rx="2.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      {started && <path d="M4.5 11.5L11.5 4.5M4.5 8L8 4.5M8 11.5l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
    </svg>
  );
}

export function Callout({ tone, title, children }: { tone: 'ok' | 'bad' | 'warn' | 'accent'; title?: ReactNode; children?: ReactNode }) {
  const tones = {
    ok: 'bg-ok-soft border-ok/30',
    bad: 'bg-bad-soft border-bad/30',
    warn: 'bg-warn-soft border-warn/30',
    accent: 'bg-accent-soft border-accent/30',
  } as const;
  const titleTone = { ok: 'text-ok', bad: 'text-bad', warn: 'text-warn', accent: 'text-accent-fg' } as const;
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>
      {title && <div className={`mb-1 font-bold ${titleTone[tone]}`}>{title}</div>}
      {children && <div className="text-fg">{children}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line bg-surface px-4 py-8 text-center text-sm text-muted">{children}</div>;
}

/** Notebook divider label for a track (colour comes from the `track-N` class on it or a parent). */
export function TrackTab({ index, children }: { index: number; children: ReactNode }) {
  return <span className={`track-tab ${trackClass(index)}`}>{children}</span>;
}

const TRACK_COLORS = 6;

/** `track-1` … `track-6` (colours defined in index.css), cycling for longer outlines. */
export function trackClass(index: number): string {
  return `track-${(index % TRACK_COLORS) + 1}`;
}
