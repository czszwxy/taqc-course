import { createContext, useContext, useId, type ReactNode } from 'react';

/** Ids of the Field around an input, so the label and the hint are linked to it (screen readers, getByLabel in tests). */
interface FieldIds {
  inputId: string;
  labelId: string;
  hintId?: string;
  required: boolean;
}

const FieldContext = createContext<FieldIds | null>(null);

export function Field({ label, hint, children, required }: { label: string; hint?: string; children: ReactNode; required?: boolean }) {
  const base = useId();
  const ids: FieldIds = { inputId: `${base}input`, labelId: `${base}label`, hintId: hint ? `${base}hint` : undefined, required: Boolean(required) };
  return (
    <FieldContext.Provider value={ids}>
      <div>
        <label id={ids.labelId} htmlFor={ids.inputId} className="label">
          {label} {required && <span className="text-bad" aria-hidden="true">*</span>}
        </label>
        {children}
        {hint && (
          <div id={ids.hintId} className="mt-1 text-[12.5px] text-faint">
            {hint}
          </div>
        )}
      </div>
    </FieldContext.Provider>
  );
}

export function TextInput({ value, onChange, placeholder, disabled }: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  const field = useContext(FieldContext);
  return (
    <input
      id={field?.inputId}
      aria-describedby={field?.hintId}
      aria-required={field?.required}
      className="input"
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

const DEFAULT_TEXTAREA_ROWS = 3;

export function TextArea({ value, onChange, placeholder, disabled, rows = DEFAULT_TEXTAREA_ROWS }: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; rows?: number }) {
  const field = useContext(FieldContext);
  return (
    <textarea
      id={field?.inputId}
      aria-describedby={field?.hintId}
      aria-required={field?.required}
      className="textarea"
      rows={rows}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function Select({ value, onChange, options, disabled }: { value: string; onChange: (v: string) => void; options: readonly string[]; disabled?: boolean }) {
  const field = useContext(FieldContext);
  return (
    <select id={field?.inputId} aria-describedby={field?.hintId} aria-required={field?.required} className="select" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      <option value="">— choose —</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

interface StepsEditorProps {
  steps: string[];
  onChange: (s: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  /** What one line is called in button and input names: "step" for test steps, "item" for list answers. */
  itemName?: string;
}

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

export function StepsEditor({ steps, onChange, disabled, placeholder, itemName = 'step' }: StepsEditorProps) {
  const field = useContext(FieldContext);
  const list = steps.length ? steps : [''];
  const set = (i: number, v: string) => onChange(list.map((s, j) => (j === i ? v : s)));
  return (
    <div className="space-y-2" role="group" aria-labelledby={field?.labelId} aria-describedby={field?.hintId}>
      {list.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-5 text-right text-xs font-semibold tabular-nums text-faint">{i + 1}.</span>
          <input
            id={i === 0 ? field?.inputId : undefined}
            aria-label={`${capitalize(itemName)} ${i + 1}`}
            aria-required={i === 0 ? field?.required : undefined}
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
            aria-label={`Remove ${itemName} ${i + 1}`}
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" disabled={disabled} onClick={() => onChange([...list, ''])}>
        + Add {itemName}
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
