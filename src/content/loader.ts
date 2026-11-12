import {
  courseSchema,
  formatZodError,
  lessonSchema,
  moduleSchema,
  taskSchema,
  type CourseFile,
  type CourseStatus,
  type Resource,
  type Task,
} from './schema';

/*
 * The loader reads all content from these folders — adding a folder is enough, no registry edits.
 * content/modules/   — the shared module pool (lessons, tasks)
 * content/courses/   — one JSON outline per profession; a course lists the module slugs it uses
 */
const courseFiles = import.meta.glob<unknown>('/content/courses/*.json', { eager: true, import: 'default' });
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
const databaseFiles = import.meta.glob<string>('/content/databases/*.sql', { query: '?raw', import: 'default', eager: true });

/** SQL setup scripts for sql tasks, keyed by file name without .sql (e.g. "gadgetly"). */
export const DATABASE_SCRIPTS: Record<string, string> = Object.fromEntries(
  Object.entries(databaseFiles).map(([path, sql]) => [path.slice(path.lastIndexOf('/') + 1).replace('.sql', ''), sql]),
);

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

/** A module as it appears in one course (its number is the position in that course). */
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
  /** File name of content/courses/<id>.json — stable, used in URLs (/course/<id>). */
  id: string;
  title: string;
  subtitle: string;
  tagline: string;
  description: string;
  icon: string;
  status: CourseStatus;
  order: number;
  tracks: CourseTrack[];
  modules: CourseModule[];
  /** All available lessons in course order. */
  lessons: CourseLesson[];
  modulesBySlug: Map<string, CourseModule>;
}

export interface Catalog {
  /** Courses in catalog order. */
  courses: Course[];
  coursesById: Map<string, Course>;
  lessonsById: Map<string, CourseLesson>;
  tasksById: Map<string, CourseTask>;
  errors: string[];
}

interface ModuleMeta {
  title: string;
  description: string;
  goals: string[];
}

interface ContentIndex {
  moduleMeta: Map<string, ModuleMeta>;
  lessonsByModule: Map<string, CourseLesson[]>;
  lessonsById: Map<string, CourseLesson>;
  tasksById: Map<string, CourseTask>;
}

const leadingNumber = (slug: string) => parseInt(slug, 10) || 0;
const bySlug = <T extends { slug: string }>(a: T, b: T) => a.slug.localeCompare(b.slug);
const JSON_EXT = '.json';
const TS_EXT = '.ts';
/** "/content/courses/manual-qa.json" → "manual-qa" (the glob only returns .json files). */
const fileName = (path: string) => path.slice(path.lastIndexOf('/') + 1, -JSON_EXT.length);

/** The course shown first and used when nothing else is selected. */
export const DEFAULT_COURSE_ID = 'qa-automation-ts';

function indexContent(errors: string[]): ContentIndex {
  const moduleMeta = new Map<string, ModuleMeta>();
  Object.entries(moduleFiles).forEach(([path, raw]) => {
    const r = moduleSchema.safeParse(raw);
    if (r.success) moduleMeta.set(path.split('/')[3] ?? '', r.data);
    else errors.push(`${path}: ${formatZodError(r.error)}`);
  });

  const lessonsByModule = new Map<string, CourseLesson[]>();
  const lessonsById = new Map<string, CourseLesson>();
  Object.entries(lessonFiles).forEach(([path, raw]) => {
    const [, , , m = '', , l = ''] = path.split('/');
    const r = lessonSchema.safeParse(raw);
    if (!r.success) {
      errors.push(`${path}: ${formatZodError(r.error)}`);
      return;
    }
    const lesson: CourseLesson = { id: `${m}/${l}`, moduleSlug: m, slug: l, number: leadingNumber(l), ...r.data, tasks: [] };
    lessonsById.set(lesson.id, lesson);
    lessonsByModule.set(m, [...(lessonsByModule.get(m) ?? []), lesson]);
  });
  lessonsByModule.forEach((list) => list.sort(bySlug));

  const tasksById = new Map<string, CourseTask>();
  Object.entries(taskFiles).forEach(([path, raw]) => {
    const [, , , m = '', , l = '', , t = ''] = path.split('/');
    const r = taskSchema.safeParse(raw);
    if (!r.success) {
      errors.push(`${path}: ${formatZodError(r.error)}`);
      return;
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
  });

  const all = [...tasksById.values()];
  all
    .filter((ct) => ct.isVariant)
    .forEach((ct) => {
      const main = tasksById.get(ct.mainId);
      if (!main || main.isVariant) errors.push(`${ct.id}: variantOf "${ct.task.variantOf}" does not point to a main task`);
      else main.variants.push(ct);
    });
  all.forEach((ct) => ct.variants.sort(bySlug));
  all
    .filter((ct) => !ct.isVariant)
    .forEach((ct) => {
      const lesson = lessonsById.get(ct.lessonId);
      if (lesson) lesson.tasks.push(ct);
      else errors.push(`${ct.id}: task folder has no lesson.json in its lesson`);
    });
  lessonsById.forEach((lesson) => lesson.tasks.sort(bySlug));

  return { moduleMeta, lessonsByModule, lessonsById, tasksById };
}

function plannedLessons(titles: string[] | undefined, lessons: CourseLesson[]): PlannedLesson[] {
  const fromTitles: PlannedLesson[] = (titles ?? []).map((title, i) => ({
    number: i + 1,
    title,
    lesson: lessons.find((x) => x.number === i + 1),
  }));
  const extra = lessons.filter((ls) => !fromTitles.some((p) => p.lesson === ls)).map((ls) => ({ number: ls.number, title: ls.title, lesson: ls }));
  return [...fromTitles, ...extra].sort((a, b) => a.number - b.number);
}

function buildCourse(id: string, data: CourseFile, index: ContentIndex): Course {
  let position = 0;
  const tracks: CourseTrack[] = data.tracks.map((track) => ({
    id: track.id,
    title: track.title,
    description: track.description,
    modules: track.modules.map((mm): CourseModule => {
      position += 1;
      const meta = index.moduleMeta.get(mm.slug);
      const lessons = index.lessonsByModule.get(mm.slug) ?? [];
      return {
        slug: mm.slug,
        number: position,
        title: meta?.title ?? mm.title,
        description: meta?.description ?? '',
        goals: meta?.goals ?? [],
        trackId: track.id,
        trackTitle: track.title,
        available: Boolean(meta) && lessons.length > 0,
        lessons,
        planned: plannedLessons(mm.lessons, lessons),
      };
    }),
  }));
  const modules = tracks.flatMap((t) => t.modules);
  return {
    id,
    title: data.title,
    subtitle: data.subtitle,
    tagline: data.tagline,
    description: data.description,
    icon: data.icon,
    status: data.status,
    order: data.order,
    tracks,
    modules,
    lessons: modules.flatMap((m) => m.lessons),
    modulesBySlug: new Map(modules.map((m) => [m.slug, m])),
  };
}

function buildCatalog(): Catalog {
  const errors: string[] = [];
  const index = indexContent(errors);

  const courses = Object.entries(courseFiles)
    .flatMap(([path, raw]) => {
      const r = courseSchema.safeParse(raw);
      if (r.success) return [buildCourse(fileName(path), r.data, index)];
      errors.push(`${path}: ${formatZodError(r.error)}`);
      return [];
    })
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

  const listed = new Set(courses.flatMap((c) => c.modules.map((m) => m.slug)));
  [...index.moduleMeta.keys()]
    .filter((slug) => !listed.has(slug))
    .forEach((slug) => errors.push(`content/modules/${slug}: module is not listed in any content/courses/*.json`));

  return {
    courses,
    coursesById: new Map(courses.map((c) => [c.id, c])),
    lessonsById: index.lessonsById,
    tasksById: index.tasksById,
    errors,
  };
}

export const catalog = buildCatalog();
export const lessonsById = catalog.lessonsById;
export const tasksById = catalog.tasksById;

export function getCourse(id: string | null | undefined): Course | undefined {
  return id ? catalog.coursesById.get(id) : undefined;
}

/**
 * The course a module (or one of its lessons) is shown in: the preferred course (the one the learner is
 * studying) when it lists the module, otherwise the first course that does.
 */
export function courseForModule(moduleSlug: string, preferredId?: string): Course | undefined {
  const preferred = getCourse(preferredId);
  if (preferred?.modulesBySlug.has(moduleSlug)) return preferred;
  return catalog.courses.find((c) => c.modulesBySlug.has(moduleSlug));
}

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
  const mutants = Object.fromEntries(mutantPaths.map((p, i) => [p.slice(base.length + 'mutants/'.length, -TS_EXT.length), mutantCode[i] ?? '']));
  return { starter, solution, tests, support, mutants };
}

/* ---------- Navigation helpers ---------- */

export const coursePath = (course: { id: string }) => `/course/${course.id}`;

export const lessonPath = (lesson: { moduleSlug: string; slug: string }, tab?: string) =>
  `/learn/${lesson.moduleSlug}/${lesson.slug}${tab ? `?tab=${tab}` : ''}`;

export const taskPath = (t: CourseTask) => `/learn/${t.moduleSlug}/${t.lessonSlug}/${t.slug}`;

/** Previous / next lesson in the given course's order. */
export function neighbourLessons(lessonId: string, course: Course | undefined): { prev?: CourseLesson; next?: CourseLesson } {
  const lessons = course?.lessons ?? [];
  const i = lessons.findIndex((l) => l.id === lessonId);
  if (i < 0) return {};
  return { prev: i > 0 ? lessons[i - 1] : undefined, next: lessons[i + 1] };
}
