import type { ReactNode } from 'react';

export function Field({ label, hint, children, required }: { label: string; hint?: string; children: ReactNode; required?: boolean }) {
  return (
    <div>
      <div className="label">
        {label} {required && <span className="text-bad">*</span>}
      </div>
      {children}
      {hint && <div className="mt-1 text-[12.5px] text-faint">{hint}</div>}
    </div>
  );
}

export function TextInput({ value, onChange, placeholder, disabled }: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return <input className="input" value={value} placeholder={placeholder} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
}

export function TextArea({ value, onChange, placeholder, disabled, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; rows?: number }) {
  return <textarea className="textarea" rows={rows} value={value} placeholder={placeholder} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
}

export function Select({ value, onChange, options, disabled }: { value: string; onChange: (v: string) => void; options: readonly string[]; disabled?: boolean }) {
  return (
    <select className="select" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      <option value="">— choose —</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function StepsEditor({ steps, onChange, disabled, placeholder }: { steps: string[]; onChange: (s: string[]) => void; disabled?: boolean; placeholder?: string }) {
  const list = steps.length ? steps : [''];
  const set = (i: number, v: string) => onChange(list.map((s, j) => (j === i ? v : s)));
  return (
    <div className="space-y-2">
      {list.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-5 text-right text-xs font-semibold tabular-nums text-faint">{i + 1}.</span>
          <input
            className="input"
            value={s}
            disabled={disabled}
            placeholder={i === 0 ? placeholder : ''}
            onChange={(e) => set(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onChange([...list.slice(0, i + 1), '', ...list.slice(i + 1)]);
              }
            }}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={disabled || list.length === 1}
            onClick={() => onChange(list.filter((_, j) => j !== i))}
            aria-label={`Remove step ${i + 1}`}
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" disabled={disabled} onClick={() => onChange([...list, ''])}>
        + Add step
      </button>
    </div>
  );
}

/** Read-only view of a structured answer (model test case / bug report). */
export function ModelView({ rows }: { rows: [string, string | string[]][] }) {
  return (
    <dl className="divide-y divide-line text-sm">
      {rows
        .filter(([, v]) => (Array.isArray(v) ? v.length > 0 : v.trim() !== ''))
        .map(([k, v]) => (
          <div key={k} className="grid gap-1 py-2 sm:grid-cols-[150px_1fr]">
            <dt className="font-semibold text-muted">{k}</dt>
            <dd className="whitespace-pre-wrap">
              {Array.isArray(v) ? (
                <ol className="list-decimal space-y-0.5 pl-5">
                  {v.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              ) : (
                v
              )}
            </dd>
          </div>
        ))}
    </dl>
  );
}
