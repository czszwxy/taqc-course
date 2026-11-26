/**
 * `npm test`: the Workdesk numbers (src/features/workdesk/stats.ts) — streaks over local days and ranks.
 * Times are built with local `new Date(y, m, d, h)`, so the checks do not depend on the machine's time zone.
 */
import assert from 'node:assert/strict';
import type { TaskProgress } from '../src/features/progress/store';
import { bestStreak, currentStreak, localDay, rankOf, solvedPerDay, streakGrid } from '../src/features/workdesk/stats';

const YEAR = 2026;
const NOV = 10;
const MORNING = 9;
const LATE = 23;
const MON_24 = 24;
const TUE_25 = 25;
const WED_26 = 26;
const at = (day: number, hour = MORNING): string => new Date(YEAR, NOV, day, hour).toISOString();
const solved = (day: number, hour?: number): TaskProgress => ({
  status: 'solved',
  attempts: 1,
  failedAttempts: 0,
  hintsUsed: 0,
  solutionViewed: false,
  solvedAt: at(day, hour),
  updatedAt: at(day, hour),
});

const TODAY = localDay(new Date(YEAR, NOV, WED_26, MORNING));
const TWO = 2;
const THREE = 3;
const FOUR = 4;
const GRID_DAYS = 14;
const EXPLORER_START = 10;
const QUARTER_TO_PRACTITIONER = 16.25;
const QUARTER = 0.25;
const ALL = 100;

const checks: [string, () => void][] = [
  [
    'solved tasks count on their local day; attempts do not count',
    () => {
      const tasks = { a: solved(MON_24), b: solved(MON_24, LATE), c: solved(WED_26), d: { ...solved(TUE_25), status: 'attempted' as const } };
      assert.deepEqual([...solvedPerDay({ tasks }).entries()].sort(), [
        ['2026-11-24', TWO],
        ['2026-11-26', 1],
      ]);
    },
  ],
  [
    'the streak runs back from today, or from yesterday while today is still open',
    () => {
      const days = new Set(['2026-11-23', '2026-11-24', '2026-11-25']);
      assert.equal(currentStreak(days, TODAY), THREE);
      assert.equal(currentStreak(new Set([...days, TODAY]), TODAY), FOUR);
      assert.equal(currentStreak(new Set(['2026-11-20']), TODAY), 0);
    },
  ],
  [
    'the best streak is the longest run, across a month end',
    () => assert.equal(bestStreak(new Set(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-05'])), THREE),
  ],
  [
    'the grid shows last week and this week from Monday; later days are the future',
    () => {
      const grid = streakGrid(new Set(['2026-11-17']), TODAY);
      assert.equal(grid.length, GRID_DAYS);
      assert.equal(grid[0]?.day, '2026-11-16');
      assert.equal(grid.find((c) => c.today)?.day, TODAY);
      assert.deepEqual(grid.filter((c) => c.done).map((c) => c.day), ['2026-11-17']);
      assert.deepEqual(grid.filter((c) => c.future).map((c) => c.day), ['2026-11-27', '2026-11-28', '2026-11-29']);
    },
  ],
  [
    'ranks follow course progress; the last one has no next',
    () => {
      assert.deepEqual(rankOf(0), { title: 'Beginner', next: 'Explorer', progress: 0 });
      assert.deepEqual(rankOf(EXPLORER_START), { title: 'Explorer', next: 'Practitioner', progress: 0 });
      assert.equal(rankOf(QUARTER_TO_PRACTITIONER).progress, QUARTER);
      assert.deepEqual(rankOf(ALL), { title: 'Job-ready', progress: 1 });
    },
  ],
];

const failures = checks.flatMap(([name, check]) => {
  try {
    check();
    return [];
  } catch (e) {
    return [`✗ ${name}\n  ${e instanceof Error ? e.message : String(e)}`];
  }
});
console.log(failures.length === 0 ? `Workdesk: ${checks.length} checks passed.` : failures.join('\n'));
process.exitCode = failures.length === 0 ? 0 : 1;
