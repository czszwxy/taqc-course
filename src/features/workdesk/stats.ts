import type { ProgressData } from '../progress/store';
import type { IconName } from '../../components/icons';

/**
 * Pure numbers behind the Workdesk (the home screen once the learner has started): days with a solved task,
 * streaks, today's count, stickers and rank. All derived from ProgressData, so merged / synced progress just works.
 * A "day" is the learner's local calendar day, written "YYYY-MM-DD" (so strings compare in date order).
 */

const DAYS_IN_WEEK = 7;
const GRID_WEEKS = 2;
const FULL_PERCENT = 100;

/** Local calendar day of a time ("en-CA" formats as YYYY-MM-DD). */
export function localDay(time: string | Date): string {
  return (typeof time === 'string' ? new Date(time) : time).toLocaleDateString('en-CA');
}

function addDays(day: string, delta: number): string {
  const [y = 0, m = 1, d = 1] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d + delta));
}

/** Local days on which tasks were solved (first solve of each task), with how many on each day. */
export function solvedPerDay(data: Pick<ProgressData, 'tasks'>): Map<string, number> {
  return Object.values(data.tasks)
    .filter((t) => t.status === 'solved' && t.solvedAt)
    .reduce((acc, t) => {
      const day = localDay(t.solvedAt ?? '');
      return acc.set(day, (acc.get(day) ?? 0) + 1);
    }, new Map<string, number>());
}

/** Days in a row with a solved task, ending today — or yesterday, while today is still open. */
export function currentStreak(days: ReadonlySet<string>, today: string): number {
  const runBack = (day: string): number => (days.has(day) ? 1 + runBack(addDays(day, -1)) : 0);
  return runBack(days.has(today) ? today : addDays(today, -1));
}

export function bestStreak(days: ReadonlySet<string>): number {
  const runForward = (day: string): number => (days.has(day) ? 1 + runForward(addDays(day, 1)) : 0);
  return [...days].filter((d) => !days.has(addDays(d, -1))).reduce((best, start) => Math.max(best, runForward(start)), 0);
}

export interface DayCell {
  day: string;
  done: boolean;
  today: boolean;
  future: boolean;
}

/** Last week and this week, Monday first — the bullet-journal habit grid. */
export function streakGrid(days: ReadonlySet<string>, today: string): DayCell[] {
  const [y = 0, m = 1, d = 1] = today.split('-').map(Number);
  const weekday = (new Date(y, m - 1, d).getDay() + DAYS_IN_WEEK - 1) % DAYS_IN_WEEK;
  const first = addDays(today, -weekday - DAYS_IN_WEEK);
  return Array.from({ length: GRID_WEEKS * DAYS_IN_WEEK }, (_, i) => {
    const day = addDays(first, i);
    return { day, done: days.has(day), today: day === today, future: day > today };
  });
}

/** What the stickers are earned from. */
export interface DeskFacts {
  solvedCount: number;
  solvedTypes: ReadonlySet<string>;
  bestStreak: number;
  bestDay: number;
  lessonsDone: number;
  modulesDone: number;
}

export type StickerTone = 'warn' | 'ok' | 'accent' | 'bad';

export interface Sticker {
  id: string;
  title: string;
  icon: IconName;
  tone: StickerTone;
  earned: (f: DeskFacts) => boolean;
}

const TEN = 10;
const FIFTY = 50;
const SHORT_STREAK = 3;
const WEEK_STREAK = 7;
/** A fixed bar, not the learner's goal setting: a sticker must never go away when the goal is raised. */
const BUSY_DAY = 3;

/** In the order they are usually earned: the first one not earned yet is shown as "Next". Every rule only ever turns true. */
export const STICKERS: Sticker[] = [
  { id: 'first-task', title: 'First task solved', icon: 'checklist', tone: 'ok', earned: (f) => f.solvedCount >= 1 },
  { id: 'first-lesson', title: 'First lesson complete', icon: 'docs', tone: 'accent', earned: (f) => f.lessonsDone >= 1 },
  { id: 'first-goal', title: '3 tasks in one day', icon: 'compass', tone: 'bad', earned: (f) => f.bestDay >= BUSY_DAY },
  { id: 'streak-3', title: '3 days in a row', icon: 'sun', tone: 'warn', earned: (f) => f.bestStreak >= SHORT_STREAK },
  { id: 'first-bug', title: 'First bug report', icon: 'bug', tone: 'warn', earned: (f) => f.solvedTypes.has('bug-report') },
  { id: 'first-code', title: 'First code check green', icon: 'tool', tone: 'ok', earned: (f) => f.solvedTypes.has('code') || f.solvedTypes.has('python') },
  { id: 'ten-tasks', title: '10 tasks solved', icon: 'auto', tone: 'accent', earned: (f) => f.solvedCount >= TEN },
  { id: 'first-sql', title: 'First SQL query', icon: 'search', tone: 'accent', earned: (f) => f.solvedTypes.has('sql') },
  { id: 'module', title: 'Module finished', icon: 'courses', tone: 'ok', earned: (f) => f.modulesDone >= 1 },
  { id: 'streak-7', title: '7 days in a row', icon: 'repeat', tone: 'warn', earned: (f) => f.bestStreak >= WEEK_STREAK },
  { id: 'first-playwright', title: 'First Playwright test', icon: 'desktop', tone: 'bad', earned: (f) => f.solvedTypes.has('playwright') },
  { id: 'fifty-tasks', title: '50 tasks solved', icon: 'hint', tone: 'accent', earned: (f) => f.solvedCount >= FIFTY },
];

/** Course progress (percent) where each rank starts. */
const EXPLORER_FROM = 10;
const PRACTITIONER_FROM = 35;
const ALMOST_FROM = 70;

/** Ranks along the route, by course progress (percent of lessons). */
const RANKS = [
  { title: 'Beginner', from: 0 },
  { title: 'Explorer', from: EXPLORER_FROM },
  { title: 'Practitioner', from: PRACTITIONER_FROM },
  { title: 'Almost there', from: ALMOST_FROM },
  { title: 'Job-ready', from: FULL_PERCENT },
];

export interface Rank {
  title: string;
  next?: string;
  /** 0…1: the way from this rank to the next. */
  progress: number;
}

export function rankOf(percent: number): Rank {
  const index = RANKS.reduce((at, r, i) => (percent >= r.from ? i : at), 0);
  const current = RANKS[index] ?? { title: '', from: 0 };
  const next = RANKS[index + 1];
  if (!next) return { title: current.title, progress: 1 };
  return { title: current.title, next: next.title, progress: Math.min(1, (percent - current.from) / (next.from - current.from)) };
}

/** Minutes left in a lesson from its length and how far it is done. */
export function minutesLeft(minutes: number, percent: number): number {
  return Math.max(1, Math.round((minutes * (FULL_PERCENT - percent)) / FULL_PERCENT));
}
