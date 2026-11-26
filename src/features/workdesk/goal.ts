import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const LIGHT_DAY = 1;
const STEADY_DAY = 3;
const BIG_DAY = 5;

/** Tasks a day the learner aims for; chosen on the Workdesk. */
export const GOAL_CHOICES = [LIGHT_DAY, STEADY_DAY, BIG_DAY] as const;
export type DailyGoal = (typeof GOAL_CHOICES)[number];
const DEFAULT_GOAL: DailyGoal = STEADY_DAY;

/**
 * Kept in its own key, apart from the progress and settings stores, so it does not collide with the accounts work;
 * that work can move it into the synced settings later.
 */
export const useDailyGoal = create<{ goal: DailyGoal; setGoal: (goal: DailyGoal) => void }>()(
  persist((set) => ({ goal: DEFAULT_GOAL, setGoal: (goal) => set({ goal }) }), { name: 'my-university:goal', version: 1 }),
);

/** What the Workdesk last showed on this device, so fills and celebrations play only for what changed since. */
export interface DeskSeen {
  day: string;
  solvedToday: number;
  stickers: string[];
  rankProgress: number;
}

const SEEN_KEY = 'my-university:workdesk-seen';

export function readSeen(): DeskSeen | null {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as DeskSeen) : null;
  } catch {
    return null;
  }
}

export function writeSeen(seen: DeskSeen): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    /* storage unavailable: the next visit simply replays from zero */
  }
}
