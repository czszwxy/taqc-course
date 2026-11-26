import type { ProgressData, TaskProgress } from '../progress/store';

/**
 * Merges the progress of two devices so that nothing is lost: a task solved anywhere stays solved, counters take the
 * larger value, read lessons and checked links are united, and of two different drafts the newer one wins. Pure.
 * Read lessons and checked links can be undone: an undo leaves a tombstone (`undone`, key → time), and on each key
 * the newer of "done" and "undone" wins — otherwise the other device's copy would bring the undone item back.
 */

/** Tombstone keys in `ProgressData.undone`: `theory:<lessonId>` and `link:<url>`. */
export const UNDONE_THEORY = 'theory:';
export const UNDONE_LINK = 'link:';

function earliest(a: string | undefined, b: string | undefined): string | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return a < b ? a : b;
}

function latest(a: string, b: string): string {
  return a > b ? a : b;
}

function mergeTask(a: TaskProgress, b: TaskProgress): TaskProgress {
  const solvedAt = earliest(a.solvedAt, b.solvedAt);
  return {
    status: a.status === 'solved' || b.status === 'solved' ? 'solved' : 'attempted',
    attempts: Math.max(a.attempts, b.attempts),
    failedAttempts: Math.max(a.failedAttempts, b.failedAttempts),
    hintsUsed: Math.max(a.hintsUsed, b.hintsUsed),
    solutionViewed: a.solutionViewed || b.solutionViewed,
    ...(solvedAt === undefined ? {} : { solvedAt }),
    updatedAt: latest(a.updatedAt, b.updatedAt),
  };
}

/** Union of two records; keys present on both sides are combined with `both`. */
function unite<T>(a: Record<string, T>, b: Record<string, T>, both: (x: T, y: T) => T): Record<string, T> {
  return Object.keys({ ...a, ...b }).reduce<Record<string, T>>((acc, key) => {
    const x = a[key];
    const y = b[key];
    const value = x !== undefined && y !== undefined ? both(x, y) : (x ?? y);
    return value === undefined ? acc : { ...acc, [key]: value };
  }, {});
}

/** When a switch was turned on: read lessons and new link checks hold a time; links checked by older versions hold `true` (oldest). */
function onTime(value: string | boolean): string {
  return typeof value === 'string' ? value : '';
}

/** Read lessons / checked links of both sides, minus those undone later than they were done (newer of the two times wins). */
function mergeSwitches<T extends string | boolean>(prefix: string, a: Record<string, T>, b: Record<string, T>, undone: Record<string, string>): Record<string, T> {
  const united = unite(a, b, (x, y) => (onTime(y) > onTime(x) ? y : x));
  return Object.fromEntries(
    Object.entries(united).filter(([key, value]) => {
      const undoneAt = undone[`${prefix}${key}`];
      return value !== false && (undoneAt === undefined || onTime(value) > undoneAt);
    }),
  );
}

/** JSON with object keys sorted, so equal data always gives the same text. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([x], [y]) => (x < y ? -1 : 1));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sameProgress(a: ProgressData, b: ProgressData): boolean {
  return stableStringify(a) === stableStringify(b);
}

interface MergedDrafts {
  drafts: Record<string, unknown>;
  draftTimes: Record<string, string>;
}

function mergeDrafts(local: ProgressData, remote: ProgressData): MergedDrafts {
  const localTimes = local.draftTimes ?? {};
  const remoteTimes = remote.draftTimes ?? {};
  const keys = Object.keys({ ...local.drafts, ...remote.drafts });
  return keys.reduce<MergedDrafts>(
    (acc, key) => {
      const inLocal = key in local.drafts;
      const inRemote = key in remote.drafts;
      const localTime = localTimes[key] ?? '';
      const remoteTime = remoteTimes[key] ?? '';
      // A draft that exists on one side only is kept; of two different drafts the more recently saved one wins.
      const useRemote = !inLocal || (inRemote && remoteTime > localTime);
      const draft = useRemote ? remote.drafts[key] : local.drafts[key];
      const time = useRemote ? remoteTime : localTime;
      return { drafts: { ...acc.drafts, [key]: draft }, draftTimes: time ? { ...acc.draftTimes, [key]: time } : acc.draftTimes };
    },
    { drafts: {}, draftTimes: {} },
  );
}

function laterLast(a: ProgressData['last'], b: ProgressData['last']): ProgressData['last'] {
  if (!a) return b;
  if (!b) return a;
  return b.at > a.at ? b : a;
}

/** Keeps only the entries of a record whose time (from `timeOf`) is after `since`. */
function newerThan<T>(record: Record<string, T>, since: string, timeOf: (key: string, value: T) => string | undefined): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([key, value]) => (timeOf(key, value) ?? '') > since));
}

/**
 * Only what changed after `since` (an ISO time): used when another device reset or imported the progress — work done
 * here after that moment is kept, everything older follows the reset. Links have no times, so none of them are kept.
 */
export function changesSince(data: ProgressData, since: string): ProgressData {
  const draftTimes = newerThan(data.draftTimes ?? {}, since, (_key, time) => time);
  const last = data.last && data.last.at > since ? data.last : undefined;
  return {
    tasks: newerThan(data.tasks, since, (_key, task) => task.updatedAt),
    drafts: newerThan(data.drafts, since, (key) => draftTimes[key]),
    draftTimes,
    theoryRead: newerThan(data.theoryRead, since, (_key, time) => time),
    verifiedLinks: newerThan(data.verifiedLinks, since, (_key, value) => onTime(value)),
    undone: newerThan(data.undone ?? {}, since, (_key, time) => time),
    ...(last === undefined ? {} : { last }),
  };
}

/**
 * This device's progress combined with a stored copy (gist or account), honouring a reset / import on either side:
 * the newer epoch wins. Used by both syncs.
 */
export function combineProgress(local: ProgressData, localEpoch: string, remote: { data: ProgressData; epoch: string } | null): ProgressData {
  if (remote === null) return local;
  // Another device reset / imported after this one last synced: follow it, keep only the work done here since then.
  if (remote.epoch > localEpoch) return mergeProgress(remote.data, changesSince(local, remote.epoch));
  // This device reset / imported: the stored copy keeps only what the other devices did after that moment.
  if (localEpoch > remote.epoch) return mergeProgress(local, changesSince(remote.data, localEpoch));
  return mergeProgress(local, remote.data);
}

export function mergeProgress(local: ProgressData, remote: ProgressData): ProgressData {
  const { drafts, draftTimes } = mergeDrafts(local, remote);
  const last = laterLast(local.last, remote.last);
  const undone = unite(local.undone ?? {}, remote.undone ?? {}, latest);
  return {
    tasks: unite(local.tasks, remote.tasks, mergeTask),
    drafts,
    draftTimes,
    theoryRead: mergeSwitches(UNDONE_THEORY, local.theoryRead, remote.theoryRead, undone),
    verifiedLinks: mergeSwitches(UNDONE_LINK, local.verifiedLinks, remote.verifiedLinks, undone),
    undone,
    ...(last === undefined ? {} : { last }),
  };
}
