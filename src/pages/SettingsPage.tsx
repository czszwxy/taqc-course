import { useRef, useState } from 'react';
import { catalog } from '../content/loader';
import { useCurrentCourse } from '../app/currentCourse';
import { snapshotProgress, useProgress, useSettings, type EditorMode, type ProgressData } from '../features/progress/store';
import { courseStats } from '../features/progress/selectors';
import { Callout } from '../components/ui';
import { Icon, type IconName } from '../components/icons';
import { SyncSection } from '../features/sync/SyncSection';
import { isSyncConnected, syncNow } from '../features/sync/sync';

/** Progress files carry the app id; files exported before the rename say qa-academy. */
const APP_ID = 'my-university';
const IMPORTABLE_APPS = new Set([APP_ID, 'qa-academy']);
const JSON_INDENT = 2;
/** Length of the date part of an ISO timestamp: "2026-11-12". */
const ISO_DATE_LENGTH = 10;

const EDITOR_MODES: { mode: EditorMode; icon: IconName; label: string }[] = [
  { mode: 'auto', icon: 'auto', label: 'Auto (simple on phones)' },
  { mode: 'full', icon: 'desktop', label: 'Always full' },
  { mode: 'simple', icon: 'phone', label: 'Always simple' },
];

export function SettingsPage() {
  const { theme, setTheme, editorMode, setEditorMode } = useSettings();
  const tasks = useProgress((s) => s.tasks);
  const theoryRead = useProgress((s) => s.theoryRead);
  const importData = useProgress((s) => s.importData);
  const reset = useProgress((s) => s.reset);
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const current = useCurrentCourse();
  const stats = current ? courseStats(current, { tasks, theoryRead }) : undefined;
  const availableModules = new Set(catalog.courses.flatMap((c) => c.modules.filter((m) => m.available).map((m) => m.slug))).size;

  const exportProgress = () => {
    const blob = new Blob([JSON.stringify({ app: APP_ID, version: 1, exportedAt: new Date().toISOString(), data: snapshotProgress() }, null, JSON_INDENT)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-university-progress-${new Date().toISOString().slice(0, ISO_DATE_LENGTH)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as { app?: string; data?: ProgressData };
      if (!IMPORTABLE_APPS.has(parsed.app ?? '') || !parsed.data || typeof parsed.data.tasks !== 'object') throw new Error('This is not a my-university progress file.');
      const synced = isSyncConnected();
      const question = synced
        ? 'Replace your current progress with the imported file? Sync is on, so the copy on GitHub (and your other devices) will be replaced too.'
        : 'Replace your current progress with the imported file?';
      if (!confirm(question)) return;
      importData(parsed.data);
      if (synced) void syncNow('replace');
      setMessage({ tone: 'ok', text: 'Progress imported.' });
    } catch (e) {
      setMessage({ tone: 'bad', text: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 lg:px-8">
      <h1 className="font-display text-[1.9rem] font-bold">Settings &amp; progress</h1>

      <section className="card mt-6 p-5">
        <h2 className="font-display text-lg font-bold">Appearance</h2>
        <div className="mt-3 flex gap-2">
          {(['dark', 'light'] as const).map((t) => (
            <button key={t} className={`btn ${theme === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTheme(t)}>
              <Icon name={t === 'dark' ? 'moon' : 'sun'} /> {t === 'dark' ? 'Blueprint (dark)' : 'Paper (light)'}
            </button>
          ))}
        </div>
      </section>

      <section className="card mt-4 p-5">
        <h2 className="font-display text-lg font-bold">Code editor</h2>
        <p className="mt-1 text-sm text-muted">
          The full editor (the one from VS Code) has autocomplete and error underlines, but it is awkward with a phone keyboard. The simple editor is made for
          phones: no autocorrect, auto-indent and a row of keys for brackets and quotes.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {EDITOR_MODES.map(({ mode, icon, label }) => (
            <button key={mode} className={`btn ${editorMode === mode ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setEditorMode(mode)}>
              <Icon name={icon} /> {label}
            </button>
          ))}
        </div>
      </section>

      <SyncSection />

      <section className="card mt-4 p-5">
        <h2 className="font-display text-lg font-bold">Your progress</h2>
        <p className="mt-1 text-sm text-muted">
          {current && stats && (
            <>
              {current.icon} {current.title} ({current.subtitle}): {stats.lessonsCompleted}/{stats.lessonsTotal} lessons completed ·{' '}
              {stats.tasksSolved}/{stats.tasksTotal} tasks solved.{' '}
            </>
          )}
          Progress of all courses is stored only in this browser (localStorage). Export it regularly as a backup or to move it to another device: the
          course on your computer and the website on your phone each keep their own progress — export on one, import on the other.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={exportProgress}>
            <Icon name="download" /> Export progress (JSON)
          </button>
          <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" /> Import progress
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImport(f);
              // Lets the same file be chosen again after an import (the input keeps its last value otherwise).
              if (fileRef.current) fileRef.current.value = '';
            }}
          />
          <button
            className="btn btn-ghost text-bad"
            onClick={() => {
              const synced = isSyncConnected();
              const warning = synced ? ' Sync is on, so it will be deleted on GitHub and your other devices too.' : '';
              if (confirm(`Delete ALL progress, drafts and hints? This cannot be undone (export first if unsure).${warning}`)) {
                reset();
                if (synced) void syncNow('replace');
                setMessage({ tone: 'ok', text: 'Progress reset.' });
              }
            }}
          >
            Reset all progress
          </button>
        </div>
        {message && (
          <div className="mt-4">
            <Callout tone={message.tone}>{message.text}</Callout>
          </div>
        )}
      </section>

      <section className="card mt-4 p-5">
        <h2 className="font-display text-lg font-bold">Content status</h2>
        <p className="mt-1 text-sm text-muted">
          {catalog.courses.length} courses, {availableModules} modules ready, {catalog.lessonsById.size} lessons, {catalog.tasksById.size} task files (including similar
          tasks).
        </p>
        {catalog.errors.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 font-mono text-xs text-bad">
            {catalog.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ok">✓ All content files are valid.</p>
        )}
      </section>
    </div>
  );
}
