import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Course, CourseModule } from '../content/loader';
import { lessonStats, moduleStats } from '../features/progress/selectors';
import { trackClass } from '../components/ui';
import { formatModuleNumber } from '../lib/format';

type ProgressInput = Parameters<typeof moduleStats>[1];
type ModuleProgress = ReturnType<typeof moduleStats>;
type PlannedLesson = CourseModule['planned'][number];
export type StationState = 'done' | 'here' | 'started' | 'ahead' | 'soon';

/** Station marker per state: filled = done, big ring = you are here, tinted = started, ring = ahead, dashed = not built yet. */
const STATION: Record<StationState, string> = {
  done: 'h-4 w-4 border-[3px] border-track bg-track',
  here: 'h-6 w-6 border-[5px] border-track bg-surface',
  started: 'h-4 w-4 border-[3px] border-track bg-track/35',
  ahead: 'h-4 w-4 border-[3px] border-track bg-surface',
  soon: 'h-4 w-4 border-2 border-dashed border-faint bg-surface',
};
/** A piece of the line: solid in the track colour, dotted where the module or lesson is not built yet. */
export const LINE = 'w-1.5 bg-track';
export const LINE_UNBUILT = 'w-0 border-l-[6px] border-dotted border-line';

/**
 * Row sizes of the line: `large` rows (`my-0.5 py-3` + a text-lg number) on the course map and the module page,
 * `compact` rows (`py-1.5`, 14px text) in the lesson menu. Full class names, so Tailwind sees them.
 */
const ROW = {
  large: { rail: 'w-10 sm:w-14', marker: 'top-7', first: 'top-7 bottom-0', last: 'top-0 h-7' },
  compact: { rail: 'w-6', marker: 'top-4', first: 'top-4 bottom-0', last: 'top-0 h-4' },
} as const;
export type RowSize = keyof typeof ROW;

/** A station marker on the rail, centred on the first text line of its row. */
export function StationMarker({ state, size = 'large' }: { state: StationState; size?: RowSize }) {
  // The ping only on the big maps: the lesson menu is seen on every lesson page, where it would just be noise.
  const ping = state === 'here' && size === 'large' ? 'station-here' : '';
  return (
    <span
      className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-200 ${ROW[size].marker} ${STATION[state]} ${ping}`}
    />
  );
}

/** Where the piece of line sits in a row of a list: the line starts at the first stop and ends at the last one. */
export function linePosition(index: number, count: number, size: RowSize = 'large'): string {
  if (count === 1) return 'hidden';
  if (index === 0) return ROW[size].first;
  if (index === count - 1) return ROW[size].last;
  return 'inset-y-0';
}

/** The "you are here" label next to the current station. */
export function HereLabel() {
  return <span className="shrink-0 rounded bg-highlight px-1.5 py-0.5 text-xs font-bold text-highlight-fg">you are here</span>;
}

export function stationState(m: CourseModule, ms: ModuleProgress, here: string | undefined): StationState {
  if (!m.available) return 'soon';
  if (m.slug === here) return 'here';
  if (ms.total > 0 && ms.completed === ms.total) return 'done';
  if (ms.started) return 'started';
  return 'ahead';
}

/** What a screen reader says about a lesson whose marker it cannot see ("you are here" and "coming soon" are visible text). */
export const STATE_LABEL: Partial<Record<StationState, string>> = { done: 'done', started: 'in progress', ahead: 'not started' };

/** A lesson's state on the line: one rule for the stops on the course map and the stations on the module page. */
export function lessonState(p: PlannedLesson, data: ProgressInput, here: string | undefined): StationState {
  if (!p.lesson) return 'soon';
  if (p.lesson.id === here) return 'here';
  const s = lessonStats(p.lesson, data);
  if (s.complete) return 'done';
  if (s.started) return 'started';
  return 'ahead';
}

/** A lesson stop next to a station on the course map ("you are here" belongs to the station, so it never reaches a stop). */
const STOP: Record<StationState, string> = {
  done: 'border-track bg-track',
  here: 'border-line',
  started: 'border-track bg-track/35',
  ahead: 'border-line',
  soon: 'border-dashed border-line',
};

function stopClass(p: PlannedLesson, data: ProgressInput): string {
  return `h-2.5 w-2.5 rounded-full border-2 ${STOP[lessonState(p, data, undefined)]}`;
}

/** The count next to the stops: the stops show which lessons are done, the count says how many. */
function moduleCount(m: CourseModule, ms: ModuleProgress): string {
  if (!m.available) return 'coming soon';
  if (ms.started) return `${ms.completed} of ${ms.total} done`;
  return `${ms.total} lessons`;
}

/** The left column of a row: a piece of the line (`line` = its position and look) with an optional marker on it. */
export function Rail({ line, size = 'large', children }: { line: string; size?: RowSize; children?: ReactNode }) {
  return (
    <div className={`relative shrink-0 ${ROW[size].rail}`} aria-hidden="true">
      <span className={`absolute left-1/2 -translate-x-1/2 ${line}`} />
      {children}
    </div>
  );
}

function Station({ module: m, data, here }: { module: CourseModule; data: ProgressInput; here: string | undefined }) {
  const ms = moduleStats(m, data);
  const state = stationState(m, ms, here);
  return (
    <li className="flex">
      <Rail line={`inset-y-0 ${m.available ? LINE : LINE_UNBUILT}`}>
        <StationMarker state={state} />
      </Rail>
      <Link
        to={`/module/${m.slug}`}
        className={`group my-0.5 flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg px-3 py-3 transition-colors hover:bg-hover ${m.available ? '' : 'text-faint'}`}
      >
        <span className={`w-7 shrink-0 font-display text-lg font-bold tabular-nums ${m.available ? 'text-track' : ''}`}>{formatModuleNumber(m.number)}</span>
        <span className="min-w-0 flex-1 font-bold leading-snug group-hover:text-accent-fg">{m.title}</span>
        {state === 'here' && <HereLabel />}
        <span className="flex w-full items-center gap-3 pl-10 sm:w-auto sm:pl-0">
          {m.planned.length > 0 && (
            <span className="flex flex-wrap gap-1" aria-hidden="true">
              {m.planned.map((p) => (
                <span key={p.number} className={stopClass(p, data)} />
              ))}
            </span>
          )}
          <span className="shrink-0 text-xs tabular-nums text-muted">{moduleCount(m, ms)}</span>
        </span>
      </Link>
    </li>
  );
}

/**
 * The course map as a transit line from the first module to "First job": each track is a line in its own colour,
 * modules are stations, lessons are stops, and a track change is an interchange.
 */
export function RouteMap({ course, data, here }: { course: Course; data: ProgressInput; here: string | undefined }) {
  const lastTrack = course.tracks.length - 1;
  return (
    <ol className="page mt-6 max-w-4xl px-2 py-2 sm:px-4" aria-label="Course route">
      {course.tracks.map((track, i) => (
        <li key={track.id} className={trackClass(i)}>
          <div className="flex">
            <Rail line={`${i === 0 ? 'top-1/2 bottom-0' : 'inset-y-0'} ${LINE}`}>
              <span className="absolute left-1/2 top-1/2 h-5 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-fg bg-surface" />
            </Rail>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 px-3 py-4">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-track font-bold text-surface">{i + 1}</span>
              <h3 className="min-w-0 font-display text-xl font-bold leading-tight">{track.title}</h3>
              {track.description && <p className="w-full text-sm text-muted">{track.description}</p>}
            </div>
          </div>
          <ol>
            {track.modules.map((m) => (
              <Station key={m.slug} module={m} data={data} here={here} />
            ))}
          </ol>
          {i === lastTrack && (
            <div className="flex">
              <Rail line={`top-0 bottom-1/2 ${LINE}`}>
                <span className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-md border-[5px] border-fg bg-surface" />
              </Rail>
              <div className="px-3 py-5">
                <div className="font-display text-2xl font-bold">First job</div>
                <div className="text-sm text-muted">End of the line: you are ready to apply.</div>
              </div>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
