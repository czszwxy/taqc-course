import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { lessonPath, lessonsById, neighbourLessons, tasksById, type Course, type CourseLesson, type CourseModule } from '../../content/loader';
import { useProgress } from '../progress/store';
import { courseStats, lessonStats, moduleStats } from '../progress/selectors';
import { learnPathParts } from '../../app/currentCourse';
import { lessonState, type StationState } from '../../app/RouteMap';
import { trackIndexOf } from '../../app/tracks';
import { trackClass } from '../../components/ui';
import { Icon } from '../../components/icons';
import { formatModuleNumber } from '../../lib/format';
import {
  bestStreak,
  currentStreak,
  localDay,
  minutesLeft,
  rankOf,
  solvedPerDay,
  STICKERS,
  streakGrid,
  type DeskFacts,
  type StickerTone,
} from './stats';
import { GOAL_CHOICES, readSeen, useDailyGoal, writeSeen } from './goal';

type ProgressInput = Parameters<typeof lessonStats>[1];

const RING_SIZE = 96;
const RING_CENTER = 48;
const RING_RADIUS = 38;
const RING_DIAMETER = 76;
const RING_STROKE = 9;
const RING_LENGTH = Math.PI * RING_DIAMETER;
const RING_TEXT_Y = 55;
const QUARTER_TURN = -90;
/** Arrival fills start after the cards have risen in (cards: 50 ms apart). */
const FILL_DELAY_MS = 250;
const FILL_MS = 450;
const BAR_DELAY_MS = 350;
const BAR_MS = 500;
const AFTERNOON_FROM = 12;
const EVENING_FROM = 18;
const NIGHT_FROM = 23;
const MORNING_FROM = 5;
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
/** Stickers lie a little crooked, like real ones; each keeps its own tilt. */
const TILTS = ['-8deg', '6deg', '-3deg', '4deg', '-6deg', '7deg', '-4deg', '3deg', '-7deg', '5deg', '-2deg', '6deg'];
const STICKER_ICON_SIZE = 18;

const STICKER_TONE: Record<StickerTone, string> = {
  ok: 'border-ok bg-ok-soft text-ok',
  warn: 'border-warn bg-warn-soft text-warn',
  accent: 'border-accent bg-accent-soft text-accent-fg',
  bad: 'border-bad bg-bad-soft text-bad',
};

/** Stops of the module on the "Continue" card. */
const MINI_STOP: Record<StationState, string> = {
  done: 'h-3 w-3 border-2 border-track bg-track',
  here: 'station-here h-4 w-4 border-[3px] border-fg bg-highlight',
  started: 'h-3 w-3 border-2 border-track bg-track/35',
  ahead: 'h-3 w-3 border-2 border-faint bg-surface',
  soon: 'h-3 w-3 border-2 border-dashed border-line bg-surface',
};

function greeting(hour: number): string {
  if (hour >= NIGHT_FROM || hour < MORNING_FROM) return 'Late study session';
  if (hour >= EVENING_FROM) return 'Good evening';
  if (hour >= AFTERNOON_FROM) return 'Good afternoon';
  return 'Good morning';
}

function daysWord(n: number): string {
  return n === 1 ? 'day' : 'days';
}

function streakNote(streak: number, solvedToday: number): string {
  if (streak === 0) return 'start a streak today!';
  if (solvedToday > 0) return `${streak} ${daysWord(streak)} in a row — keep going!`;
  return `${streak} ${daysWord(streak)} in a row — today keeps it alive`;
}

function streakLine(streak: number, solvedToday: number): string {
  if (solvedToday > 0) return `${streak} ${daysWord(streak)} in a row. See you tomorrow.`;
  if (streak > 0) return `Solve a task today to make it ${streak + 1}.`;
  return 'Solve a task today to start a streak.';
}

function goalNote(done: number, goal: number): string {
  const left = goal - done;
  if (left <= 0) return 'goal done!';
  if (left === 1) return 'one more!';
  return `${left} more to go`;
}

function dayCellClass(cell: { done: boolean; today: boolean; future: boolean }): string {
  if (cell.today) return 'border-fg bg-highlight text-highlight-fg';
  if (cell.future) return 'border-dashed border-line';
  return cell.done ? 'border-faint text-ok' : 'border-faint';
}

function ringOffset(done: number, goal: number): number {
  return RING_LENGTH * (1 - Math.min(done, goal) / goal);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** The lesson to continue: the last one visited in this course (or the next one when it is finished), else the first unfinished. */
function continueTarget(course: Course, data: ProgressInput, lastPath: string | undefined): { lesson: CourseLesson; module: CourseModule } | undefined {
  const { moduleSlug, lessonSlug } = learnPathParts(lastPath);
  const visited = moduleSlug && lessonSlug ? lessonsById.get(`${moduleSlug}/${lessonSlug}`) : undefined;
  const inCourse = visited && course.modulesBySlug.has(visited.moduleSlug) ? visited : undefined;
  const afterVisited = inCourse && lessonStats(inCourse, data).complete ? (neighbourLessons(inCourse.id, course).next ?? inCourse) : inCourse;
  const lesson = afterVisited ?? course.lessons.find((l) => !lessonStats(l, data).complete) ?? course.lessons[0];
  const module = lesson ? course.modulesBySlug.get(lesson.moduleSlug) : undefined;
  return lesson && module ? { lesson, module } : undefined;
}

function Card({ area, order, label, className = '', children }: { area: string; order: number; label: string; className?: string; children: ReactNode }) {
  return (
    <section aria-label={label} className={`card lift rise p-4 ${className}`} style={{ gridArea: area, '--i': order } as CSSProperties}>
      {children}
    </section>
  );
}

/**
 * The home screen once the learner has started ("Workdesk"): continue, today's goal, day streak, stickers and rank.
 * Motion: cards rise in; the goal ring and the rank bar fill from what this device showed last time; reaching the goal
 * pops the ring, today's streak box draws its tick and new stickers land. Text never animates.
 */
export function Workdesk({ course }: { course: Course }) {
  const tasks = useProgress((s) => s.tasks);
  const theoryRead = useProgress((s) => s.theoryRead);
  const last = useProgress((s) => s.last);
  const { goal, setGoal } = useDailyGoal();
  const [seen] = useState(readSeen);
  const ringRef = useRef<SVGCircleElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const data = { tasks, theoryRead };
  const now = new Date();
  const today = localDay(now);
  const perDay = solvedPerDay(data);
  const days = new Set(perDay.keys());
  const solvedToday = perDay.get(today) ?? 0;
  const streak = currentStreak(days, today);
  const stats = courseStats(course, data);
  const solvedEntries = Object.entries(tasks).filter(([, t]) => t.status === 'solved');
  const facts: DeskFacts = {
    solvedCount: solvedEntries.length,
    solvedTypes: new Set(solvedEntries.map(([id]) => tasksById.get(id)?.task.type ?? '')),
    bestStreak: bestStreak(days),
    bestDay: Math.max(0, ...perDay.values()),
    goal,
    lessonsDone: stats.lessonsCompleted,
    modulesDone: course.modules.filter((m) => m.available && m.lessons.length > 0 && moduleStats(m, data).completed === m.lessons.length).length,
  };
  const earned = STICKERS.filter((s) => s.earned(facts)).map((s) => s.id);
  const nextSticker = STICKERS.find((s) => !s.earned(facts));
  const rank = rankOf(stats.percent);
  const target = continueTarget(course, data, last?.path);

  // What changed since this device last showed the desk (a first visit celebrates nothing, it only fills up).
  const firstVisit = seen === null;
  const seenSolved = seen && seen.day === today ? seen.solvedToday : 0;
  const goalJustReached = !firstVisit && solvedToday >= goal && seenSolved < goal;
  const todayJustTicked = !firstVisit && solvedToday > 0 && seenSolved === 0;
  const landed = new Set(firstVisit ? [] : earned.filter((id) => !seen.stickers.includes(id)));
  const [arrival] = useState(() => ({
    ringFrom: ringOffset(firstVisit ? 0 : seenSolved, goal),
    barFrom: seen && seen.rankProgress <= rank.progress ? seen.rankProgress : 0,
  }));

  useEffect(() => {
    writeSeen({ day: today, solvedToday, stickers: earned, rankProgress: rank.progress });
  });

  // On arrival only: the ring and the bar fill from the last shown value (WAAPI; the CSS transition handles goal changes).
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const easing = getComputedStyle(document.documentElement).getPropertyValue('--ease-out').trim();
    const ring = ringRef.current;
    const bar = barRef.current;
    const ringTo = ring?.getAttribute('stroke-dashoffset') ?? String(arrival.ringFrom);
    const barTo = bar?.style.transform ?? '';
    const animations = [
      ring?.animate([{ strokeDashoffset: String(arrival.ringFrom) }, { strokeDashoffset: ringTo }], { duration: FILL_MS, delay: FILL_DELAY_MS, easing, fill: 'backwards' }),
      bar?.animate([{ transform: `scaleX(${arrival.barFrom})` }, { transform: barTo }], { duration: BAR_MS, delay: BAR_DELAY_MS, easing, fill: 'backwards' }),
    ];
    return () => animations.forEach((a) => a?.cancel());
  }, [arrival]);

  const grid = streakGrid(days, today);
  const done = Math.min(solvedToday, goal);

  return (
    <div aria-label="Your desk">
      <div className="rise mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1" style={{ '--i': 0 } as CSSProperties}>
        <h1 className="font-display text-[1.9rem] font-bold leading-tight">{greeting(now.getHours())}</h1>
        <span className="hand text-[1.5rem]">{streakNote(streak, solvedToday)}</span>
      </div>

      <div className="workdesk-grid">
        {target && <ContinueCard course={course} data={data} lesson={target.lesson} module={target.module} lastPath={last?.path} />}

        <Card area="goal" order={2} label="Today's goal" className="text-center">
          <div className="text-left text-xs font-bold text-muted">Today&apos;s goal</div>
          <svg
            width={RING_SIZE}
            height={RING_SIZE}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            role="img"
            aria-label={`${done} of ${goal} tasks solved today`}
            className={`mx-auto mt-1 ${goalJustReached ? 'goal-pop' : ''}`}
          >
            <circle cx={RING_CENTER} cy={RING_CENTER} r={RING_RADIUS} fill="none" strokeWidth={RING_STROKE} className="stroke-hover" />
            <circle
              ref={ringRef}
              cx={RING_CENTER}
              cy={RING_CENTER}
              r={RING_RADIUS}
              fill="none"
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={RING_LENGTH}
              strokeDashoffset={ringOffset(solvedToday, goal)}
              transform={`rotate(${QUARTER_TURN} ${RING_CENTER} ${RING_CENTER})`}
              className="goal-ring stroke-ok"
            />
            <text x={RING_CENTER} y={RING_TEXT_Y} textAnchor="middle" className="fill-fg font-sans text-xl font-bold tabular-nums">
              {done} / {goal}
            </text>
          </svg>
          <div className="text-xs text-muted">tasks solved</div>
          <div className="mt-2 flex justify-center gap-1.5" role="group" aria-label="Daily goal">
            {GOAL_CHOICES.map((g) => (
              <button
                key={g}
                aria-pressed={goal === g}
                onClick={() => setGoal(g)}
                className={`min-h-7 min-w-9 rounded-full border px-3 text-xs font-bold transition-colors ${goal === g ? 'border-accent bg-accent text-accent-on' : 'border-line bg-surface text-fg hover:border-accent'}`}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="hand mt-1 text-[1.3rem]">{goalNote(solvedToday, goal)}</div>
        </Card>

        <Card area="streak" order={3} label="Day streak">
          <div className="text-xs font-bold text-muted">
            Day streak · best {facts.bestStreak} {daysWord(facts.bestStreak)}
          </div>
          <div className="mt-3 grid w-max grid-cols-7 gap-x-2.5 gap-y-1.5 text-center text-xs text-faint" aria-hidden="true">
            {WEEKDAYS.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
            {grid.map((c) => (
              <span key={c.day} title={c.day} className={`grid h-5 w-5 place-items-center rounded border-[1.5px] ${dayCellClass(c)}`}>
                {c.done && (
                  <svg viewBox="0 0 12 12" className="h-3 w-3">
                    <path
                      pathLength={1}
                      className={c.today && todayJustTicked ? 'tick-draw' : ''}
                      d="M2 6.5l2.6 2.6L10 3.4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">{streakLine(streak, solvedToday)}</p>
        </Card>

        <Card area="stickers" order={4} label="Sticker book">
          <div className="text-xs font-bold text-muted">
            Sticker book · {earned.length} of {STICKERS.length}
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {STICKERS.map((s, i) => {
              const has = earned.includes(s.id);
              return (
                <li
                  key={s.id}
                  role="img"
                  aria-label={`${s.title}${has ? '' : ' (not yet)'}`}
                  title={s.title}
                  style={{ '--rot': has ? (TILTS[i] ?? '0deg') : '0deg' } as CSSProperties}
                  className={`sticker grid h-10 w-10 place-items-center rounded-full border-[1.5px] ${has ? STICKER_TONE[s.tone] : 'border-dashed border-line text-faint opacity-60'} ${landed.has(s.id) ? 'sticker-land' : ''}`}
                >
                  <Icon name={s.icon} size={STICKER_ICON_SIZE} />
                </li>
              );
            })}
          </ul>
          {nextSticker && <p className="mt-3 text-sm text-muted">Next: “{nextSticker.title}”</p>}
        </Card>

        <Card area="rank" order={5} label="Rank">
          <div className="text-xs font-bold text-muted">Rank · {course.title}</div>
          <div className="mt-1 text-sm font-bold">
            {rank.title}
            {rank.next && <span className="font-normal text-muted"> → {rank.next}</span>}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full border border-line bg-sunken">
            <div ref={barRef} className="h-full origin-left bg-accent" style={{ transform: `scaleX(${rank.progress})` }} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function ContinueCard({ course, data, lesson, module: m, lastPath }: { course: Course; data: ProgressInput; lesson: CourseLesson; module: CourseModule; lastPath: string | undefined }) {
  const s = lessonStats(lesson, data);
  const number = m.planned.find((p) => p.lesson?.id === lesson.id)?.number ?? 1;
  // Back to the exact page (a task) when the last visit was inside this lesson.
  const resumeTo = lastPath && learnPathParts(lastPath).lessonSlug && lastPath.startsWith(lessonPath(lesson)) ? lastPath : lessonPath(lesson);
  return (
    <Card area="continue" order={1} label="Continue where you stopped" className={`border-l-4 border-l-track ${trackClass(trackIndexOf(course, m.slug))}`}>
      <div className="text-xs font-bold text-muted">Continue where you stopped</div>
      <div className="mt-1 font-display text-xl font-bold leading-snug">{lesson.title}</div>
      <div className="mt-0.5 text-xs text-muted">
        {course.title} · {course.subtitle} — module {formatModuleNumber(m.number)}, lesson {number} of {m.planned.length}
      </div>
      <div className="relative my-4 flex items-center justify-between" aria-hidden="true">
        <span className="absolute inset-x-1 top-1/2 h-1 -translate-y-1/2 rounded-full bg-track/30" />
        {m.planned.map((p) => (
          <span key={p.number} className={`relative rounded-full ${MINI_STOP[lessonState(p, data, lesson.id)]}`} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link to={resumeTo} className="btn btn-primary">
          Continue lesson →
        </Link>
        <span className="text-xs text-muted">about {minutesLeft(lesson.minutes, s.percent)} min left</span>
      </div>
    </Card>
  );
}
