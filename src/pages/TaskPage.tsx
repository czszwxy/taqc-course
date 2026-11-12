import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { course, lessonPath, neighbourLessons, taskPath, type CourseLesson, type CourseTask } from '../content/loader';
import { TASK_TYPE_LABEL, type Task } from '../content/schema';
import { useProgress } from '../features/progress/store';
import { taskStatus } from '../features/progress/selectors';
import { StatusIcon } from '../components/ui';
import { QuizTaskView } from '../features/tasks/QuizTaskView';
import { ValueSetTaskView } from '../features/tasks/ValueSetTaskView';
import { TestCaseTaskView } from '../features/tasks/TestCaseTaskView';
import { BugReportTaskView } from '../features/tasks/BugReportTaskView';
import { ClassifyTaskView } from '../features/tasks/ClassifyTaskView';
import { OrderTaskView } from '../features/tasks/OrderTaskView';
import { WrittenTaskView } from '../features/tasks/WrittenTaskView';
import { TableTaskView } from '../features/tasks/TableTaskView';
import { SelectorTaskView } from '../features/tasks/SelectorTaskView';
import type { TaskViewProps } from '../features/tasks/types';
import { NotFound } from './NotFound';

const CodeTaskView = lazy(() => import('../features/tasks/CodeTaskView'));
const SqlTaskView = lazy(() => import('../features/sql/SqlTaskView'));
const PlaywrightTaskView = lazy(() => import('../features/playwright/PlaywrightTaskView'));

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
};

/** Task types whose "similar task" is generated from a new seed (re-sampled / re-shuffled) instead of a variant folder. */
const SEEDED_TYPES: ReadonlySet<Task['type']> = new Set<Task['type']>(['quiz', 'value-set', 'classify', 'order']);

function nextTarget(lesson: CourseLesson, main: CourseTask): { to: string; label: string } | undefined {
  const nextTask = lesson.tasks[lesson.tasks.indexOf(main) + 1];
  if (nextTask) return { to: taskPath(nextTask), label: 'Next task' };
  const { next: nextLesson } = neighbourLessons(lesson.id);
  if (nextLesson) return { to: lessonPath(nextLesson), label: 'Next lesson' };
  return undefined;
}

export function TaskPage() {
  const { moduleSlug, lessonSlug, taskSlug } = useParams();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const setLast = useProgress((s) => s.setLast);
  const tasks = useProgress((s) => s.tasks);

  const main = course.tasksById.get(`${moduleSlug}/${lessonSlug}/${taskSlug}`);
  const lesson = main ? course.lessonsById.get(main.lessonId) : undefined;
  const vSlug = params.get('v');
  const seed = Number(params.get('seed') ?? '0') || 0;
  const active = main && vSlug ? (main.variants.find((v) => v.slug === vSlug) ?? main) : main;

  useEffect(() => {
    if (main && !main.isVariant) setLast(location.pathname + location.search, main.task.title);
  }, [main, location.pathname, location.search, setLast]);

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

  const idx = lesson.tasks.indexOf(main);
  const next = nextTarget(lesson, main);

  const status = taskStatus(main, tasks);
  const variantIndex = group.indexOf(active);

  const header = (
    <div className="mb-5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        <Link to={lessonPath(lesson, 'practice')} className="hover:text-accent-fg">
          ← {lesson.title}
        </Link>
        <span className="text-faint">·</span>
        <span>
          Task {idx + 1} of {lesson.tasks.length}
        </span>
      </div>
      <div className="mt-2 flex items-start gap-2.5">
        <StatusIcon status={status} size={20} />
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
      <View key={`${active.id}:${seed}`} {...props} />
    </Suspense>
  );
}
