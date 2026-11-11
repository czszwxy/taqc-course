import courseJson from '../../content/course.json';
import {
  courseSchema,
  formatZodError,
  lessonSchema,
  moduleSchema,
  taskSchema,
  type Resource,
  type Task,
} from './schema';

/* Content is discovered from the file system: adding a folder is enough, no registry edits. */
const moduleFiles = import.meta.glob<unknown>('/content/modules/*/module.json', { eager: true, import: 'default' });
const lessonFiles = import.meta.glob<unknown>('/content/modules/*/lessons/*/lesson.json', { eager: true, import: 'default' });
const taskFiles = import.meta.glob<unknown>('/content/modules/*/lessons/*/tasks/*/task.json', {
  eager: true,
  import: 'default',
});
const lessonMdFiles = import.meta.glob<string>('/content/modules/*/lessons/*/lesson.md', { query: '?raw', import: 'default' });
const taskCodeFiles = import.meta.glob<string>('/content/modules/*/lessons/*/tasks/*/*.ts', {
  query: '?raw',
  import: 'default',
});
const mutantFiles = import.meta.glob<string>('/content/modules/*/lessons/*/tasks/*/mutants/*.ts', {
  query: '?raw',
  import: 'default',
});

export interface CourseTask {
  id: string;
  slug: string;
  number: number;
  lessonId: string;
  moduleSlug: string;
  lessonSlug: string;
  task: Task;
  isVariant: boolean;
  /** id of the main task of the group (itself for main tasks). */
  mainId: string;
  /** Similar tasks (only filled on main tasks). */
  variants: CourseTask[];
}

export interface CourseLesson {
  id: string;
  moduleSlug: string;
  slug: string;
  number: number;
  title: string;
  minutes: number;
  summary: string;
  resources: Resource[];
  /** Main tasks in order (variants are reachable through task.variants). */
  tasks: CourseTask[];
}

export interface PlannedLesson {
  number: number;
  title: string;
  lesson?: CourseLesson;
}

export interface CourseModule {
  slug: string;
  number: number;
  title: string;
  description: string;
  goals: string[];
  trackId: string;
  trackTitle: string;
  available: boolean;
  lessons: CourseLesson[];
  planned: PlannedLesson[];
}

export interface CourseTrack {
  id: string;
  title: string;
  description?: string;
  modules: CourseModule[];
}

export interface Course {
  title: string;
  tracks: CourseTrack[];
  modules: CourseModule[];
  /** All available lessons in course order. */
  lessons: CourseLesson[];
  lessonsById: Map<string, CourseLesson>;
  tasksById: Map<string, CourseTask>;
  modulesBySlug: Map<string, CourseModule>;
  errors: string[];
}

const leadingNumber = (slug: string) => parseInt(slug, 10) || 0;
const bySlug = <T extends { slug: string }>(a: T, b: T) => a.slug.localeCompare(b.slug);

function buildCourse(): Course {
  const errors: string[] = [];

  const parsedCourse = courseSchema.safeParse(courseJson);
  if (!parsedCourse.success) errors.push(`content/course.json: ${formatZodError(parsedCourse.error)}`);
  const courseData = parsedCourse.success ? parsedCourse.data : { title: 'QA Academy', tracks: [] };

  const moduleMeta = new Map<string, { title: string; description: string; goals: string[] }>();
  for (const [path, raw] of Object.entries(moduleFiles)) {
    const slug = path.split('/')[3];
    const r = moduleSchema.safeParse(raw);
    if (r.success) moduleMeta.set(slug, r.data);
    else errors.push(`${path}: ${formatZodError(r.error)}`);
  }

  const lessonsByModule = new Map<string, CourseLesson[]>();
  const lessonsById = new Map<string, CourseLesson>();
  for (const [path, raw] of Object.entries(lessonFiles)) {
    const parts = path.split('/');
    const m = parts[3];
    const l = parts[5];
    const r = lessonSchema.safeParse(raw);
    if (!r.success) {
      errors.push(`${path}: ${formatZodError(r.error)}`);
      continue;
    }
    const lesson: CourseLesson = { id: `${m}/${l}`, moduleSlug: m, slug: l, number: leadingNumber(l), ...r.data, tasks: [] };
    lessonsById.set(lesson.id, lesson);
    const list = lessonsByModule.get(m) ?? [];
    list.push(lesson);
    lessonsByModule.set(m, list);
  }

  const tasksById = new Map<string, CourseTask>();
  for (const [path, raw] of Object.entries(taskFiles)) {
    const parts = path.split('/');
    const m = parts[3];
    const l = parts[5];
    const t = parts[7];
    const r = taskSchema.safeParse(raw);
    if (!r.success) {
      errors.push(`${path}: ${formatZodError(r.error)}`);
      continue;
    }
    const lessonId = `${m}/${l}`;
    const id = `${lessonId}/${t}`;
    tasksById.set(id, {
      id,
      slug: t,
      number: leadingNumber(t),
      lessonId,
      moduleSlug: m,
      lessonSlug: l,
      task: r.data,
      isVariant: Boolean(r.data.variantOf),
      mainId: r.data.variantOf ? `${lessonId}/${r.data.variantOf}` : id,
      variants: [],
    });
  }

  for (const ct of tasksById.values()) {
    if (!ct.isVariant) continue;
    const main = tasksById.get(ct.mainId);
    if (!main || main.isVariant) errors.push(`${ct.id}: variantOf "${ct.task.variantOf}" does not point to a main task`);
    else main.variants.push(ct);
  }

  for (const ct of tasksById.values()) {
    ct.variants.sort(bySlug);
    if (ct.isVariant) continue;
    const lesson = lessonsById.get(ct.lessonId);
    if (lesson) lesson.tasks.push(ct);
    else errors.push(`${ct.id}: task folder has no lesson.json in its lesson`);
  }
  for (const lesson of lessonsById.values()) lesson.tasks.sort(bySlug);

  const listed = new Set<string>();
  const tracks: CourseTrack[] = courseData.tracks.map((track) => ({
    id: track.id,
    title: track.title,
    description: track.description,
    modules: track.modules.map((mm) => {
      listed.add(mm.slug);
      const meta = moduleMeta.get(mm.slug);
      const lessons = (lessonsByModule.get(mm.slug) ?? []).sort(bySlug);
      const planned: PlannedLesson[] = mm.lessons.map((title, i) => ({
        number: i + 1,
        title,
        lesson: lessons.find((x) => x.number === i + 1),
      }));
      for (const ls of lessons) {
        if (!planned.some((p) => p.lesson === ls)) planned.push({ number: ls.number, title: ls.title, lesson: ls });
      }
      planned.sort((a, b) => a.number - b.number);
      return {
        slug: mm.slug,
        number: leadingNumber(mm.slug),
        title: meta?.title ?? mm.title,
        description: meta?.description ?? '',
        goals: meta?.goals ?? [],
        trackId: track.id,
        trackTitle: track.title,
        available: Boolean(meta) && lessons.length > 0,
        lessons,
        planned,
      };
    }),
  }));

  for (const slug of moduleMeta.keys()) {
    if (!listed.has(slug)) errors.push(`content/modules/${slug}: module is not listed in content/course.json`);
  }

  const modules = tracks.flatMap((t) => t.modules);
  return {
    title: courseData.title,
    tracks,
    modules,
    lessons: modules.flatMap((m) => m.lessons),
    lessonsById,
    tasksById,
    modulesBySlug: new Map(modules.map((m) => [m.slug, m])),
    errors,
  };
}

export const course = buildCourse();

export async function loadLessonMarkdown(lessonId: string): Promise<string> {
  const [m, l] = lessonId.split('/');
  const load = lessonMdFiles[`/content/modules/${m}/lessons/${l}/lesson.md`];
  return load ? load() : '_Theory for this lesson is not written yet._';
}

export interface TaskCode {
  starter: string;
  solution: string;
  tests: string;
  /** Read-only support files the code can import, keyed by file name (e.g. "subject.ts"). */
  support: Record<string, string>;
  /** tests mode: broken versions of subject.ts keyed by mutant id. */
  mutants: Record<string, string>;
}

const RESERVED_CODE_FILES = new Set(['starter.ts', 'solution.ts', 'tests.ts']);

export async function loadTaskCode(taskId: string): Promise<TaskCode> {
  const [m, l, t] = taskId.split('/');
  const base = `/content/modules/${m}/lessons/${l}/tasks/${t}/`;
  const get = async (file: string) => {
    const load = taskCodeFiles[base + file];
    return load ? load() : '';
  };
  const [starter, solution, tests] = await Promise.all([get('starter.ts'), get('solution.ts'), get('tests.ts')]);
  const supportNames = Object.keys(taskCodeFiles)
    .filter((p) => p.startsWith(base))
    .map((p) => p.slice(base.length))
    .filter((name) => !RESERVED_CODE_FILES.has(name));
  const mutantPaths = Object.keys(mutantFiles).filter((p) => p.startsWith(base + 'mutants/'));
  const [supportCode, mutantCode] = await Promise.all([
    Promise.all(supportNames.map((name) => get(name))),
    Promise.all(mutantPaths.map((p) => mutantFiles[p]?.() ?? Promise.resolve(''))),
  ]);
  const support = Object.fromEntries(supportNames.map((name, i) => [name, supportCode[i] ?? '']));
  const mutants = Object.fromEntries(mutantPaths.map((p, i) => [p.slice(base.length + 'mutants/'.length).replace(/\.ts$/, ''), mutantCode[i] ?? '']));
  return { starter, solution, tests, support, mutants };
}

/* ---------- Navigation helpers ---------- */

export const lessonPath = (lesson: { moduleSlug: string; slug: string }, tab?: string) =>
  `/learn/${lesson.moduleSlug}/${lesson.slug}${tab ? `?tab=${tab}` : ''}`;

export const taskPath = (t: CourseTask) => `/learn/${t.moduleSlug}/${t.lessonSlug}/${t.slug}`;

export function neighbourLessons(lessonId: string): { prev?: CourseLesson; next?: CourseLesson } {
  const i = course.lessons.findIndex((l) => l.id === lessonId);
  return { prev: i > 0 ? course.lessons[i - 1] : undefined, next: i >= 0 ? course.lessons[i + 1] : undefined };
}
