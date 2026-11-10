import type { Course, CourseLesson, CourseModule, CourseTask } from '../../content/loader';
import type { ProgressData, TaskProgress } from './store';

export type Status = 'new' | 'attempted' | 'solved';

/** Status of a task group: solved if the main task or any similar task was solved. */
export function taskStatus(t: CourseTask, tasks: Record<string, TaskProgress>): Status {
  let st: Status = 'new';
  for (const id of [t.id, ...t.variants.map((v) => v.id)]) {
    const p = tasks[id];
    if (p?.status === 'solved') return 'solved';
    if (p && p.attempts > 0) st = 'attempted';
  }
  return st;
}

export interface LessonStats {
  solved: number;
  required: number;
  theory: boolean;
  percent: number;
  complete: boolean;
  started: boolean;
}

export function lessonStats(lesson: CourseLesson, data: Pick<ProgressData, 'tasks' | 'theoryRead'>): LessonStats {
  const required = lesson.tasks.filter((t) => !t.task.optional);
  const statuses = lesson.tasks.map((t) => taskStatus(t, data.tasks));
  const solved = required.filter((t) => taskStatus(t, data.tasks) === 'solved').length;
  const theory = Boolean(data.theoryRead[lesson.id]);
  const total = required.length + 1;
  const done = solved + (theory ? 1 : 0);
  return {
    solved,
    required: required.length,
    theory,
    percent: Math.round((done / total) * 100),
    complete: done === total,
    started: done > 0 || statuses.some((s) => s !== 'new'),
  };
}

export function moduleStats(m: CourseModule, data: Pick<ProgressData, 'tasks' | 'theoryRead'>) {
  const stats = m.lessons.map((l) => lessonStats(l, data));
  const completed = stats.filter((s) => s.complete).length;
  const percent = stats.length ? Math.round(stats.reduce((a, s) => a + s.percent, 0) / stats.length) : 0;
  return { completed, total: m.lessons.length, percent, started: stats.some((s) => s.started) };
}

export function courseStats(course: Course, data: Pick<ProgressData, 'tasks' | 'theoryRead'>) {
  const lessonStatsList = course.lessons.map((l) => lessonStats(l, data));
  const allTasks = course.lessons.flatMap((l) => l.tasks);
  return {
    lessonsCompleted: lessonStatsList.filter((s) => s.complete).length,
    lessonsTotal: course.lessons.length,
    tasksSolved: allTasks.filter((t) => taskStatus(t, data.tasks) === 'solved').length,
    tasksTotal: allTasks.length,
    percent: lessonStatsList.length
      ? Math.round(lessonStatsList.reduce((a, s) => a + s.percent, 0) / lessonStatsList.length)
      : 0,
  };
}
