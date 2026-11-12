import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  /** lessonId -> ISO date when the theory was marked as read. */
  theoryRead: Record<string, string>;
  verifiedLinks: Record<string, boolean>;
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

export const emptyProgress = (): ProgressData => ({ tasks: {}, drafts: {}, theoryRead: {}, verifiedLinks: {} });

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

      saveDraft: (taskId, draft) => set((s) => ({ drafts: { ...s.drafts, [taskId]: draft } })),

      setTheoryRead: (lessonId, read) =>
        set((s) => {
          const theoryRead = { ...s.theoryRead };
          if (read) theoryRead[lessonId] = now();
          else delete theoryRead[lessonId];
          return { theoryRead };
        }),

      setLast: (path, title) => set({ last: { path, title, at: now() } }),

      toggleVerified: (url) => set((s) => ({ verifiedLinks: { ...s.verifiedLinks, [url]: !s.verifiedLinks[url] } })),

      importData: (data) => set({ ...emptyProgress(), ...data }),

      reset: () => set({ ...emptyProgress(), last: undefined }),
    }),
    { name: STORAGE_KEYS.progress, version: 1 },
  ),
);

export function snapshotProgress(): ProgressData {
  const s = useProgress.getState();
  return { tasks: s.tasks, drafts: s.drafts, theoryRead: s.theoryRead, verifiedLinks: s.verifiedLinks, last: s.last };
}

/* ---------- Settings ---------- */

export type Theme = 'dark' | 'light';

interface SettingsState {
  theme: Theme;
  /** The course (profession) the learner is studying: course maps, lesson menus and "next lesson" follow it. */
  currentCourseId?: string;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setCurrentCourse: (id: string) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setCurrentCourse: (currentCourseId) => set({ currentCourseId }),
    }),
    { name: STORAGE_KEYS.settings, version: 1 },
  ),
);
