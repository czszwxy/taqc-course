import { useRef, useState } from 'react';
import { course } from '../content/loader';
import { snapshotProgress, useProgress, useSettings, type ProgressData } from '../features/progress/store';
import { courseStats } from '../features/progress/selectors';
import { Callout } from '../components/ui';

export function SettingsPage() {
  const { theme, setTheme } = useSettings();
  const tasks = useProgress((s) => s.tasks);
  const theoryRead = useProgress((s) => s.theoryRead);
  const importData = useProgress((s) => s.importData);
  const reset = useProgress((s) => s.reset);
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const stats = courseStats(course, { tasks, theoryRead });

  const exportProgress = () => {
    const blob = new Blob([JSON.stringify({ app: 'qa-academy', version: 1, exportedAt: new Date().toISOString(), data: snapshotProgress() }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qa-academy-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as { app?: string; data?: ProgressData };
      if (parsed.app !== 'qa-academy' || !parsed.data || typeof parsed.data.tasks !== 'object') throw new Error('This is not a QA Academy progress file.');
      if (!confirm('Replace your current progress with the imported file?')) return;
      importData(parsed.data);
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
              {t === 'dark' ? '🌙 Blueprint (dark)' : '☀️ Paper (light)'}
            </button>
          ))}
        </div>
      </section>

      <section className="card mt-4 p-5">
        <h2 className="font-display text-lg font-bold">Your progress</h2>
        <p className="mt-1 text-sm text-muted">
          {stats.lessonsCompleted}/{stats.lessonsTotal} lessons completed · {stats.tasksSolved}/{stats.tasksTotal} tasks solved. Progress is
          stored only in this browser (localStorage). Export it regularly as a backup or to move to another computer.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={exportProgress}>
            ⬇ Export progress (JSON)
          </button>
          <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
            ⬆ Import progress
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImport(f);
              e.target.value = '';
            }}
          />
          <button
            className="btn btn-ghost text-bad"
            onClick={() => {
              if (confirm('Delete ALL progress, drafts and hints? This cannot be undone (export first if unsure).')) {
                reset();
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
          {course.modules.filter((m) => m.available).length} of {course.modules.length} modules available, {course.lessons.length} lessons,{' '}
          {course.tasksById.size} task files (including similar tasks).
        </p>
        {course.errors.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 font-mono text-xs text-bad">
            {course.errors.map((e) => (
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
