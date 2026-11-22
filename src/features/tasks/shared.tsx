import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useProgress } from '../progress/store';
import { Markdown } from '../../components/Markdown';
import { PLAYGROUND_PAGES } from '../../playground/registry';
import { Icon, type IconName } from '../../components/icons';

const TITLE_ICON_SIZE = 16;

/** A panel title with its icon: the icon sits on the text line. */
function IconTitle({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Icon name={icon} size={TITLE_ICON_SIZE} className="text-accent-fg" />
      <span>{children}</span>
    </span>
  );
}

export function HintsPanel({ taskId, hints }: { taskId: string; hints: string[] }) {
  const used = useProgress((s) => s.tasks[taskId]?.hintsUsed ?? 0);
  const reveal = useProgress((s) => s.revealHint);
  if (hints.length === 0) return null;
  const shown = Math.min(used, hints.length);
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">
          <IconTitle icon="hint">
            Hints <span className="font-normal text-muted">({shown}/{hints.length})</span>
          </IconTitle>
        </div>
        {shown < hints.length && (
          <button className="btn btn-secondary btn-sm" onClick={() => reveal(taskId, shown + 1)}>
            Show hint {shown + 1}
          </button>
        )}
      </div>
      {shown > 0 && (
        <ol className="mt-3 space-y-2">
          {hints.slice(0, shown).map((h, i) => (
            <li key={i} className="flex gap-2 rounded-lg bg-warn-soft px-3 py-2">
              <span className="text-xs font-bold text-warn">{i + 1}</span>
              <Markdown compact className="min-w-0 flex-1">
                {h}
              </Markdown>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function Collapsible({ title, children, defaultOpen = false }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card">
      <button className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold" onClick={() => setOpen(!open)}>
        <span className="min-w-0 [overflow-wrap:anywhere]">{title}</span>
        <span className={`shrink-0 text-xs text-faint transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
      </button>
      {open && <div className="border-t border-line px-4 py-3">{children}</div>}
    </div>
  );
}

export function ExplanationPanel({ text, defaultOpen }: { text: string; defaultOpen?: boolean }) {
  return (
    <Collapsible title={<IconTitle icon="compass">How to approach it</IconTitle>} defaultOpen={defaultOpen}>
      <Markdown compact>{text}</Markdown>
    </Collapsible>
  );
}

export function NextActions({
  onSimilar,
  similarLabel = 'Try a similar task',
  next,
  onRetry,
  passed,
}: {
  onSimilar?: () => void;
  similarLabel?: string;
  next?: { to: string; label: string };
  onRetry?: () => void;
  passed: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!passed && onRetry && (
        <button className="btn btn-secondary" onClick={onRetry}>
          ↺ Fix and try again
        </button>
      )}
      {onSimilar && (
        <button className={`btn ${passed ? 'btn-secondary' : 'btn-primary'}`} onClick={onSimilar}>
          <Icon name="repeat" size={TITLE_ICON_SIZE} /> {similarLabel}
        </button>
      )}
      {next && (
        <Link to={next.to} className={`btn ${passed ? 'btn-primary' : 'btn-ghost'}`}>
          {next.label} →
        </Link>
      )}
    </div>
  );
}

export function FailureList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-bad/30 bg-bad-soft px-4 py-3">
      <div className="text-sm font-semibold text-bad">{title}</div>
      <ul className="mt-2 space-y-1.5">
        {items.map((m, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className="text-bad">✗</span>
            <Markdown compact className="min-w-0 flex-1">
              {m}
            </Markdown>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SelfReviewChecklist({ items }: { items: string[] }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  if (items.length === 0) return null;
  return (
    <div className="card p-4">
      <div className="text-sm font-semibold">
        <IconTitle icon="checklist">
          Self-review checklist <span className="font-normal text-muted">({checked.size}/{items.length})</span>
        </IconTitle>
      </div>
      <p className="mt-1 text-xs text-muted">Compare your answer with the model answer and honestly tick what you did.</p>
      <ul className="mt-3 space-y-1.5">
        {items.map((it, i) => (
          <li key={i}>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={checked.has(i)}
                onChange={() =>
                  setChecked((prev) => {
                    const n = new Set(prev);
                    if (n.has(i)) n.delete(i);
                    else n.add(i);
                    return n;
                  })
                }
              />
              <span>{it}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

const COPIED_FEEDBACK_MS = 2000;

/** Copies text built on click to the clipboard and briefly confirms it. */
export function CopyButton({ label, build, title, className = 'btn btn-ghost btn-sm' }: { label: ReactNode; build: () => string; title?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(build());
          setCopied(true);
          setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
        } catch {
          setCopied(false);
        }
      }}
      title={title}
    >
      {copied ? '✓ Copied' : label}
    </button>
  );
}

/** Builds a Markdown bundle the learner can paste into a chat with Claude for a detailed review. */
export function CopyForReview({ build }: { build: () => string }) {
  return (
    <CopyButton
      label={
        <>
          <Icon name="copy" size={TITLE_ICON_SIZE} /> Copy for review
        </>
      }
      build={build}
      title="Copies the task, your answer, the model answer and the criteria — paste it into a chat with Claude for detailed feedback"
    />
  );
}

/** "Open <page> in a new tab" button for tasks that practise on a Bug Playground page. */
export function PlaygroundLink({ id }: { id?: string }) {
  const page = id ? PLAYGROUND_PAGES.find((p) => p.id === id) : undefined;
  if (!page) return null;
  return (
    <Link to={page.path} target="_blank" className="btn btn-secondary mt-3 max-w-full whitespace-normal text-left">
      <Icon name="bug" /> Open “{page.title}” in a new tab ↗
    </Link>
  );
}
