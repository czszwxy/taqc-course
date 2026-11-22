import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UNDONE_LINK, UNDONE_THEORY } from '../sync/merge';

/** localStorage keys. The app was called "QA Academy" before it became my-university. */
export const STORAGE_KEYS = { progress: 'my-university:progress', settings: 'my-university:settings' } as const;
const LEGACY_STORAGE_KEYS: Record<string, string> = {
  'qa-academy:progress': STORAGE_KEYS.progress,
  'qa-academy:settings': STORAGE_KEYS.settings,
};

/** Copies progress saved under the old QA Academy keys once (the old keys stay as a backup). */
function migrateLegacyStorage(): void {
  try {
    Object.entries(LEGACY_STORAGE_KEYS)
      .filter(([, to]) => localStorage.getItem(to) === null)
      .forEach(([from, to]) => {
        const saved = localStorage.getItem(from);
        if (saved !== null) localStorage.setItem(to, saved);
      });
  } catch {
    /* storage unavailable — nothing to migrate */
  }
}
migrateLegacyStorage();

export interface TaskProgress {
  status: 'attempted' | 'solved';
  attempts: number;
  failedAttempts: number;
  hintsUsed: number;
  solutionViewed: boolean;
  solvedAt?: string;
  updatedAt: string;
}

export interface ProgressData {
  tasks: Record<string, TaskProgress>;
  /** Unsent work: code, form values, found bugs… keyed by task id. */
  drafts: Record<string, unknown>;
  /** When each draft was last saved (sync keeps the newer draft when two devices have different ones). */
  draftTimes?: Record<string, string>;
  /** lessonId -> ISO date when the theory was marked as read. */
  theoryRead: Record<string, string>;
  /** url -> ISO date when the learner ticked "I checked it" (files from older versions hold `true`). */
  verifiedLinks: Record<string, string | boolean>;
  /** Undo tombstones (`theory:<lessonId>`, `link:<url>`) -> ISO date of the undo, so sync does not bring the item back. */
  undone?: Record<string, string>;
  last?: { path: string; title: string; at: string };
}

interface ProgressActions {
  recordAttempt: (taskId: string, passed: boolean) => void;
  revealHint: (taskId: string, count: number) => void;
  markSolutionViewed: (taskId: string) => void;
  saveDraft: (taskId: string, draft: unknown) => void;
  setTheoryRead: (lessonId: string, read: boolean) => void;
  setLast: (path: string, title: string) => void;
  toggleVerified: (url: string) => void;
  importData: (data: ProgressData) => void;
  reset: () => void;
}

export const emptyProgress = (): ProgressData => ({ tasks: {}, drafts: {}, draftTimes: {}, theoryRead: {}, verifiedLinks: {}, undone: {} });

/** Switches a record entry on (value = `on`) or off (removed + an undo tombstone), keeping the tombstones in step. */
function toggled<T>(record: Record<string, T>, undone: Record<string, string> | undefined, key: string, tombstone: string, on: T | null) {
  const nextRecord = { ...record };
  const nextUndone = { ...undone };
  if (on === null) {
    delete nextRecord[key];
    nextUndone[tombstone] = now();
  } else {
    nextRecord[key] = on;
    delete nextUndone[tombstone];
  }
  return { record: nextRecord, undone: nextUndone };
}

const now = () => new Date().toISOString();
const blankTask = (): TaskProgress => ({
  status: 'attempted',
  attempts: 0,
  failedAttempts: 0,
  hintsUsed: 0,
  solutionViewed: false,
  updatedAt: now(),
});

export const useProgress = create<ProgressData & ProgressActions>()(
  persist(
    (set) => ({
      ...emptyProgress(),

      recordAttempt: (taskId, passed) =>
        set((s) => {
          const cur = s.tasks[taskId] ?? blankTask();
          const at = now();
          const next: TaskProgress = {
            ...cur,
            attempts: cur.attempts + 1,
            failedAttempts: passed ? cur.failedAttempts : cur.failedAttempts + 1,
            status: passed || cur.status === 'solved' ? 'solved' : 'attempted',
            solvedAt: cur.solvedAt ?? (passed ? at : undefined),
            updatedAt: at,
          };
          return { tasks: { ...s.tasks, [taskId]: next } };
        }),

      revealHint: (taskId, count) =>
        set((s) => {
          const cur = s.tasks[taskId] ?? blankTask();
          return { tasks: { ...s.tasks, [taskId]: { ...cur, hintsUsed: Math.max(cur.hintsUsed, count), updatedAt: now() } } };
        }),

      markSolutionViewed: (taskId) =>
        set((s) => {
          const cur = s.tasks[taskId] ?? blankTask();
          return { tasks: { ...s.tasks, [taskId]: { ...cur, solutionViewed: true, updatedAt: now() } } };
        }),

      saveDraft: (taskId, draft) => set((s) => ({ drafts: { ...s.drafts, [taskId]: draft }, draftTimes: { ...s.draftTimes, [taskId]: now() } })),

      setTheoryRead: (lessonId, read) =>
        set((s) => {
          const { record, undone } = toggled(s.theoryRead, s.undone, lessonId, `${UNDONE_THEORY}${lessonId}`, read ? now() : null);
          return { theoryRead: record, undone };
        }),

      setLast: (path, title) => set({ last: { path, title, at: now() } }),

      toggleVerified: (url) =>
        set((s) => {
          const { record, undone } = toggled(s.verifiedLinks, s.undone, url, `${UNDONE_LINK}${url}`, s.verifiedLinks[url] ? null : now());
          return { verifiedLinks: record, undone };
        }),

      importData: (data) => set({ ...emptyProgress(), ...data }),

      reset: () => set({ ...emptyProgress(), last: undefined }),
    }),
    { name: STORAGE_KEYS.progress, version: 1 },
  ),
);

export function snapshotProgress(): ProgressData {
  const s = useProgress.getState();
  return { tasks: s.tasks, drafts: s.drafts, draftTimes: s.draftTimes, theoryRead: s.theoryRead, verifiedLinks: s.verifiedLinks, undone: s.undone, last: s.last };
}

/* ---------- Settings ---------- */

export type Theme = 'dark' | 'light';

/** Code editor of code tasks: auto = the simple touch editor on phones / tablets, Monaco elsewhere. */
export type EditorMode = 'auto' | 'full' | 'simple';

interface SettingsState {
  theme: Theme;
  /** The course (profession) the learner is studying: course maps, lesson menus and "next lesson" follow it. */
  currentCourseId?: string;
  editorMode: EditorMode;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setCurrentCourse: (id: string) => void;
  setEditorMode: (mode: EditorMode) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      editorMode: 'auto',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setCurrentCourse: (currentCourseId) => set({ currentCourseId }),
      setEditorMode: (editorMode) => set({ editorMode }),
    }),
    { name: STORAGE_KEYS.settings, version: 1 },
  ),
);
