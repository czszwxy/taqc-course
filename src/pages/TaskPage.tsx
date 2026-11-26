import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react';
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { lessonPath, lessonsById, neighbourLessons, taskPath, tasksById, type Course, type CourseLesson, type CourseTask } from '../content/loader';
import { useCourseForModule } from '../app/currentCourse';
import { TASK_TYPE_LABEL, type Task } from '../content/schema';
import { useProgress } from '../features/progress/store';
import { taskStatus, type Status } from '../features/progress/selectors';
import { StatusIcon, trackClass } from '../components/ui';
import { trackIndexOf } from '../app/tracks';
import { QuizTaskView } from '../features/tasks/QuizTaskView';
import { ValueSetTaskView } from '../features/tasks/ValueSetTaskView';
import { TestCaseTaskView } from '../features/tasks/TestCaseTaskView';
import { BugReportTaskView } from '../features/tasks/BugReportTaskView';
import { ClassifyTaskView } from '../features/tasks/ClassifyTaskView';
import { OrderTaskView } from '../features/tasks/OrderTaskView';
import { WrittenTaskView } from '../features/tasks/WrittenTaskView';
import { TableTaskView } from '../features/tasks/TableTaskView';
import { SelectorTaskView } from '../features/tasks/SelectorTaskView';
import { TechCheckTaskView } from '../features/tasks/TechCheckTaskView';
import type { TaskViewProps } from '../features/tasks/types';
import { NotFound } from './NotFound';

const CodeTaskView = lazy(() => import('../features/tasks/CodeTaskView'));
const SqlTaskView = lazy(() => import('../features/sql/SqlTaskView'));
const PlaywrightTaskView = lazy(() => import('../features/playwright/PlaywrightTaskView'));
const PythonTaskView = lazy(() => import('../features/python/PythonTaskView'));
const WebTaskView = lazy(() => import('../features/web/WebTaskView'));

const TASK_VIEWS: Record<Task['type'], ComponentType<TaskViewProps>> = {
  code: CodeTaskView,
  quiz: QuizTaskView,
  'value-set': ValueSetTaskView,
  'test-case': TestCaseTaskView,
  'bug-report': BugReportTaskView,
  classify: ClassifyTaskView,
  order: OrderTaskView,
  written: WrittenTaskView,
  table: TableTaskView,
  selector: SelectorTaskView,
  sql: SqlTaskView,
  playwright: PlaywrightTaskView,
  python: PythonTaskView,
  web: WebTaskView,
  'tech-check': TechCheckTaskView,
};

/** Task types shown as statement + editor side by side; the others are one column, laid on a paper sheet. */
const SPLIT_TYPES: ReadonlySet<Task['type']> = new Set<Task['type']>(['code', 'playwright', 'python', 'web']);

/** A task stop on the lesson's line: filled = solved, tinted = tried, empty = not started. */
const TASK_STOP: Record<Status, string> = {
  solved: 'border-track bg-track text-surface',
  attempted: 'border-track bg-track/35 text-fg',
  new: 'border-line bg-surface text-muted',
};
const TASK_STOP_LABEL: Record<Status, string> = { solved: 'solved', attempted: 'tried', new: 'not started' };

/** The lesson's tasks as numbered stops on a short line; the current one is circled. */
function TaskStops({ lesson, current, course }: { lesson: CourseLesson; current: CourseTask; course: Course | undefined }) {
  const tasks = useProgress((s) => s.tasks);
  return (
    <nav aria-label="Tasks in this lesson" className={`relative flex items-center gap-3 ${trackClass(trackIndexOf(course, lesson.moduleSlug))}`}>
      <span className="absolute inset-x-1 top-1/2 h-1 -translate-y-1/2 rounded-full bg-track/30" aria-hidden="true" />
      {lesson.tasks.map((t, i) => {
        const status = taskStatus(t, tasks);
        const isCurrent = t === current;
        return (
          <Link
            key={t.id}
            to={taskPath(t)}
            aria-current={isCurrent ? 'page' : undefined}
            aria-label={`Task ${i + 1} of ${lesson.tasks.length}: ${t.task.title}, ${TASK_STOP_LABEL[status]}`}
            title={t.task.title}
            className={`relative grid h-6 w-6 place-items-center rounded-full border-2 text-xs font-bold tabular-nums transition-colors duration-200 ${TASK_STOP[status]} ${isCurrent ? 'outline-2 outline-offset-2 outline-fg' : ''}`}
          >
            {i + 1}
          </Link>
        );
      })}
    </nav>
  );
}

/** Task types whose "similar task" is generated from a new seed (re-sampled / re-shuffled) instead of a variant folder. */
const SEEDED_TYPES: ReadonlySet<Task['type']> = new Set<Task['type']>(['quiz', 'value-set', 'classify', 'order', 'tech-check']);

function nextTarget(lesson: CourseLesson, main: CourseTask, course: Course | undefined): { to: string; label: string } | undefined {
  const nextTask = lesson.tasks[lesson.tasks.indexOf(main) + 1];
  if (nextTask) return { to: taskPath(nextTask), label: 'Next task' };
  const { next: nextLesson } = neighbourLessons(lesson.id, course);
  if (nextLesson) return { to: lessonPath(nextLesson), label: 'Next lesson' };
  return undefined;
}

export function TaskPage() {
  const { moduleSlug, lessonSlug, taskSlug } = useParams();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const setLast = useProgress((s) => s.setLast);
  const tasks = useProgress((s) => s.tasks);

  const main = tasksById.get(`${moduleSlug}/${lessonSlug}/${taskSlug}`);
  const lesson = main ? lessonsById.get(main.lessonId) : undefined;
  const course = useCourseForModule(lesson?.moduleSlug);
  const vSlug = params.get('v');
  const seed = Number(params.get('seed') ?? '0') || 0;
  const active = main && vSlug ? (main.variants.find((v) => v.slug === vSlug) ?? main) : main;
  // Remembered once per visit (Layout remounts the page per task): the tick celebrates only a solve that happens here.
  const [solvedOnArrival] = useState(() => (main ? taskStatus(main, tasks) === 'solved' : false));

  useEffect(() => {
    if (main && !main.isVariant) setLast(location.pathname + location.search, main.task.title);
  }, [main, location.pathname, location.search, setLast]);

  // A "similar task" opened by its own folder URL (old link, bookmark) → its main task with ?v=.
  const variantMain = main?.isVariant ? tasksById.get(main.mainId) : undefined;
  if (main && variantMain) return <Navigate replace to={`${taskPath(variantMain)}?v=${encodeURIComponent(main.slug)}`} />;
  if (!main || main.isVariant || !lesson || !active) return <NotFound />;

  const group = [main, ...main.variants];
  let onSimilar: (() => void) | undefined;
  if (SEEDED_TYPES.has(main.task.type)) {
    onSimilar = () => setParams({ seed: String(seed + 1) });
  } else if (main.variants.length > 0) {
    onSimilar = () => {
      const idx = group.indexOf(active);
      const ordered = [...group.slice(idx + 1), ...group.slice(0, idx)];
      const target = ordered.find((t) => tasks[t.id]?.status !== 'solved') ?? ordered[0];
      setParams(target === main ? {} : { v: target.slug });
    };
  }

  const next = nextTarget(lesson, main, course);

  const status = taskStatus(main, tasks);
  const variantIndex = group.indexOf(active);

  const header = (
    <div className="mb-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
        <Link to={lessonPath(lesson, 'practice')} className="hover:text-accent-fg">
          ← {lesson.title}
        </Link>
        <TaskStops lesson={lesson} current={main} course={course} />
      </div>
      <div className="mt-2 flex items-start gap-2.5">
        <StatusIcon status={status} size={20} celebrate={!solvedOnArrival} />
        <h1 className="font-display text-[1.5rem] font-bold leading-tight">{active.task.title}</h1>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="chip chip-accent">{TASK_TYPE_LABEL[active.task.type]}</span>
        {status === 'solved' && <span className="chip chip-ok">solved</span>}
        {variantIndex > 0 && (
          <span className="chip chip-warn">
            Similar task {variantIndex} of {main.variants.length}
          </span>
        )}
        {variantIndex > 0 && (
          <button className="chip hover:text-fg" onClick={() => setParams({})}>
            back to the original task
          </button>
        )}
      </div>
    </div>
  );

  const props: TaskViewProps = { ct: active, main, seed, header, onSimilar, next };
  const View = TASK_VIEWS[active.task.type];

  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted">Loading task…</div>}>
      {SPLIT_TYPES.has(active.task.type) ? (
        <View key={`${active.id}:${seed}`} {...props} />
      ) : (
        <div className="task-sheet">
          <View key={`${active.id}:${seed}`} {...props} />
        </div>
      )}
    </Suspense>
  );
}
