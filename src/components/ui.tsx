import type { ReactNode } from 'react';
import type { Status } from '../features/progress/selectors';

export function ProgressBar({ percent, className, tone = 'accent' }: { percent: number; className?: string; tone?: 'accent' | 'ok' }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-sunken ${className ?? ''}`}>
      <div
        className={`h-full rounded-full transition-all ${tone === 'ok' ? 'bg-ok' : 'bg-accent'}`}
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </div>
  );
}

/** Circle icon: empty (new), half (in progress), check (done). */
export function StatusIcon({ status, size = 16 }: { status: Status | 'complete' | 'started'; size?: number }) {
  const done = status === 'solved' || status === 'complete';
  const started = status === 'attempted' || status === 'started';
  if (done) {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" className="shrink-0 text-ok" aria-label="done">
        <circle cx="8" cy="8" r="8" fill="currentColor" />
        <path d="M4.6 8.3l2.2 2.2 4.6-4.8" fill="none" stroke="var(--c-surface)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={`shrink-0 ${started ? 'text-accent' : 'text-faint'}`} aria-label={started ? 'in progress' : 'not started'}>
      <circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      {started && <path d="M8 3.2a4.8 4.8 0 0 1 0 9.6z" fill="currentColor" />}
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
      {title && <div className={`mb-1 font-semibold ${titleTone[tone]}`}>{title}</div>}
      {children && <div className="text-fg">{children}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">{children}</div>;
}
