/**
 * `npm test`: the rules that decide what survives a progress sync (src/features/sync/merge.ts).
 * A slip there silently loses or revives a learner's progress, so each rule has one check here.
 */
import assert from 'node:assert/strict';
import type { ProgressData, TaskProgress } from '../src/features/progress/store';
import { changesSince, mergeProgress, UNDONE_LINK, UNDONE_THEORY } from '../src/features/sync/merge';

const T1 = '2026-01-01T10:00:00.000Z';
const T2 = '2026-01-02T10:00:00.000Z';
const T3 = '2026-01-03T10:00:00.000Z';
const FEW_ATTEMPTS = 2;
const MANY_ATTEMPTS = 5;
const HINTS_USED = 2;

const progress = (part: Partial<ProgressData>): ProgressData => ({ tasks: {}, drafts: {}, draftTimes: {}, theoryRead: {}, verifiedLinks: {}, undone: {}, ...part });
const task = (part: Partial<TaskProgress>): TaskProgress => ({
  status: 'attempted',
  attempts: 1,
  failedAttempts: 1,
  hintsUsed: 0,
  solutionViewed: false,
  updatedAt: T1,
  ...part,
});

const checks: [string, () => void][] = [
  [
    'a task solved on one device stays solved; counters take the larger value',
    () => {
      const merged = mergeProgress(
        progress({ tasks: { a: task({ status: 'solved', attempts: FEW_ATTEMPTS, solvedAt: T2, updatedAt: T2 }) } }),
        progress({ tasks: { a: task({ attempts: MANY_ATTEMPTS, hintsUsed: HINTS_USED, updatedAt: T3 }) } }),
      );
      const expected = { status: 'solved', attempts: MANY_ATTEMPTS, failedAttempts: 1, hintsUsed: HINTS_USED, solutionViewed: false, solvedAt: T2, updatedAt: T3 };
      assert.deepEqual(merged.tasks.a, expected);
    },
  ],
  [
    'of two different drafts the newer one wins',
    () => {
      const merged = mergeProgress(progress({ drafts: { a: 'old' }, draftTimes: { a: T1 } }), progress({ drafts: { a: 'new' }, draftTimes: { a: T2 } }));
      assert.equal(merged.drafts.a, 'new');
    },
  ],
  [
    'an undo newer than the other device\'s "read" / "checked" wins',
    () => {
      const here = progress({ undone: { [`${UNDONE_THEORY}l1`]: T2, [`${UNDONE_LINK}https://x.test`]: T2 } });
      const there = progress({ theoryRead: { l1: T1 }, verifiedLinks: { 'https://x.test': true } });
      const merged = mergeProgress(here, there);
      assert.deepEqual([merged.theoryRead, merged.verifiedLinks], [{}, {}]);
    },
  ],
  [
    'reading again after an undo wins over the old tombstone',
    () => {
      const merged = mergeProgress(progress({ theoryRead: { l1: T3 } }), progress({ undone: { [`${UNDONE_THEORY}l1`]: T2 } }));
      assert.deepEqual(merged.theoryRead, { l1: T3 });
    },
  ],
  [
    'links checked by older versions (true) stay checked when nobody undid them',
    () => {
      const merged = mergeProgress(progress({ verifiedLinks: { u: true } }), progress({}));
      assert.deepEqual(merged.verifiedLinks, { u: true });
    },
  ],
  [
    'after a reset only work done later survives (changesSince)',
    () => {
      const kept = changesSince(progress({ tasks: { old: task({ updatedAt: T1 }), fresh: task({ updatedAt: T3 }) }, theoryRead: { l1: T1, l2: T3 } }), T2);
      assert.deepEqual([Object.keys(kept.tasks), Object.keys(kept.theoryRead)], [['fresh'], ['l2']]);
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
console.log(failures.length === 0 ? `Sync merge: ${checks.length} checks passed.` : failures.join('\n'));
process.exitCode = failures.length === 0 ? 0 : 1;
