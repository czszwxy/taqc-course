import { z } from 'zod';

/** A choice-based question or classification needs at least this many options. */
const MIN_CHOICES = 2;
/** An ordering task needs at least this many steps to be meaningful. */
const MIN_ORDER_ITEMS = 3;
/** Default share of correct answers needed to pass quizzes and classification tasks. */
export const DEFAULT_PASS_SCORE = 0.8;

/**
 * Module folder slug: two-digit order prefix, a dash, then lowercase words joined by dashes.
 * Matches "11-ts-basics", "06-qa-practice-lab"; rejects "1-intro" (one digit) and "11_TS" (underscore, capitals).
 * Try it: https://regex101.com/?regex=%5E%5Cd%7B2%7D-%5Ba-z0-9-%5D%2B%24&testString=11-ts-basics&flavor=javascript
 */
const MODULE_SLUG_RE = /^\d{2}-[a-z0-9-]+$/;

/* ---------- Course structure ---------- */

export const resourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  kind: z.enum(['docs', 'article', 'video', 'course', 'tool', 'book']),
  lang: z.enum(['en', 'uk']),
  note: z.string().optional(),
  needsVerification: z.boolean().default(true),
});

/** available = ready to learn; in-progress = some modules ready, more coming; planned = outline only. */
export const COURSE_STATUSES = ['available', 'in-progress', 'planned'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

/**
 * One profession (course) of the catalog: content/courses/<id>.json. Modules are a shared pool in
 * content/modules/ — a course lists the module slugs it uses, so one module (Git, SQL…) can be part of
 * several courses and its progress counts in all of them.
 */
export const courseSchema = z.object({
  title: z.string(),
  /** Stack or flavour shown under the title, e.g. "TypeScript + Playwright". */
  subtitle: z.string().default(''),
  /** Short handwritten-style line, e.g. "Zero → Trainee QA Automation". */
  tagline: z.string().default(''),
  description: z.string().default(''),
  icon: z.string().default('🎓'),
  status: z.enum(COURSE_STATUSES).default('planned'),
  /** Position in the catalog (ascending). */
  order: z.number().int().default(0),
  tracks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      modules: z.array(
        z.object({
          slug: z.string().regex(MODULE_SLUG_RE),
          title: z.string(),
          /** Planned lesson titles in order. Omit for an existing shared module: its real lessons are used. */
          lessons: z.array(z.string()).optional(),
        }),
      ),
    }),
  ),
});
export type CourseFile = z.infer<typeof courseSchema>;

export const moduleSchema = z.object({
  title: z.string(),
  description: z.string(),
  goals: z.array(z.string()).default([]),
});

export const lessonSchema = z.object({
  title: z.string(),
  minutes: z.number().int().positive(),
  summary: z.string(),
  resources: z.array(resourceSchema).default([]),
});

/* ---------- Tasks ---------- */

const baseTask = {
  title: z.string().min(1),
  /** Folder name of the main task this one is a "similar task" for (same lesson). */
  variantOf: z.string().optional(),
  optional: z.boolean().default(false),
  hints: z.array(z.string()).default([]),
  /** "How to approach it" — shown after a failed attempt. Markdown. */
  explanation: z.string().optional(),
};

const optionSchema = z.object({
  text: z.string(),
  correct: z.boolean().default(false),
  explain: z.string().optional(),
});

const questionBase = {
  id: z.string(),
  text: z.string(),
  code: z.string().optional(),
  explanation: z.string().optional(),
};

export const questionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('single'), ...questionBase, options: z.array(optionSchema).min(MIN_CHOICES) }),
  z.object({ kind: z.literal('multiple'), ...questionBase, options: z.array(optionSchema).min(MIN_CHOICES) }),
  z.object({
    kind: z.literal('text'),
    ...questionBase,
    accept: z.array(z.string()).min(1),
    placeholder: z.string().optional(),
  }),
]);

export const quizTaskSchema = z.object({
  type: z.literal('quiz'),
  ...baseTask,
  intro: z.string().optional(),
  /** Bug Playground page the questions are about (shows an "Open page" button). */
  playground: z.string().optional(),
  /** How many questions to show per attempt (sampled from the pool on retries). */
  show: z.number().int().positive().optional(),
  passScore: z.number().min(0).max(1).default(DEFAULT_PASS_SCORE),
  questions: z.array(questionSchema).min(1),
});

export const codeRuleSchema = z.object({
  kind: z.enum(['require', 'forbid']),
  pattern: z.string(),
  flags: z.string().optional(),
  message: z.string(),
});

/** A deliberately broken version of subject.ts (file mutants/<id>.ts) that good tests must catch. */
export const mutantSchema = z.object({
  id: z.string(),
  /** What is broken — shown after the learner's tests catch it. */
  description: z.string(),
  /** Nudge shown while this mutant survives (which case is not tested yet). */
  hint: z.string(),
});

/**
 * mode "solution" (default): the learner writes solution.ts, hidden tests.ts checks it.
 * mode "tests": the learner writes the TESTS for subject.ts. They must pass on subject.ts and fail on
 * every mutants/<id>.ts (mutation testing). solution.ts = reference tests, starter.ts = starting tests file.
 * Any other .ts file in the task folder (e.g. subject.ts, models.ts) is a read-only support file the code can import.
 */
export const codeTaskSchema = z.object({
  type: z.literal('code'),
  ...baseTask,
  statement: z.string(),
  codeRules: z.array(codeRuleSchema).default([]),
  mode: z.enum(['solution', 'tests']).default('solution'),
  mutants: z.array(mutantSchema).default([]),
  /** tests mode: minimum number of it()/test() blocks. */
  minTests: z.number().int().positive().optional(),
});

export const valueSetTaskSchema = z.object({
  type: z.literal('value-set'),
  ...baseTask,
  generator: z.object({
    name: z.string(),
    params: z.record(z.unknown()).default({}),
  }),
});

export const fieldRuleSchema = z.object({
  /** Form field name, or "any" for all fields joined. */
  field: z.string(),
  check: z.enum(['required', 'minLength', 'minItems', 'mentionsAny', 'mentionsAll', 'notMentions', 'equals', 'oneOf']),
  /** Number for minLength/minItems; regex strings (case-insensitive) for mentions*; strings for equals/oneOf. */
  value: z.union([z.number(), z.string(), z.array(z.string())]).optional(),
  message: z.string(),
});

export const PRIORITIES = ['High', 'Medium', 'Low'] as const;
export const SEVERITIES = ['Blocker', 'Critical', 'Major', 'Minor', 'Trivial'] as const;
export const TEST_TYPES = ['Positive', 'Negative'] as const;

export const testCaseSchema = z.object({
  title: z.string(),
  preconditions: z.string(),
  testData: z.string(),
  steps: z.array(z.string()),
  expectedResult: z.string(),
  priority: z.enum(PRIORITIES),
  type: z.enum(TEST_TYPES),
});

export const bugReportSchema = z.object({
  title: z.string(),
  environment: z.string(),
  preconditions: z.string(),
  steps: z.array(z.string()),
  testData: z.string().default(''),
  actualResult: z.string(),
  expectedResult: z.string(),
  severity: z.enum(SEVERITIES),
  priority: z.enum(PRIORITIES),
  attachments: z.string().default(''),
});

export const testCaseTaskSchema = z.object({
  type: z.literal('test-case'),
  ...baseTask,
  statement: z.string(),
  playground: z.string().optional(),
  rules: z.array(fieldRuleSchema).default([]),
  model: testCaseSchema,
  checklist: z.array(z.string()).default([]),
});

export const knownBugSchema = z.object({
  id: z.string(),
  title: z.string(),
  /** Every regex must match the report text (title, steps, data, actual, expected). */
  match: z.array(z.string()).min(1),
  severity: z.array(z.enum(SEVERITIES)).min(1),
  severityWhy: z.string(),
  model: bugReportSchema,
});

export const bugReportTaskSchema = z.object({
  type: z.literal('bug-report'),
  ...baseTask,
  statement: z.string(),
  playground: z.string(),
  minBugs: z.number().int().positive(),
  bugs: z.array(knownBugSchema).min(1),
  checklist: z.array(z.string()).default([]),
});

/** Sort items into categories (e.g. "error / defect / failure"). `show` samples items per attempt. */
export const classifyTaskSchema = z.object({
  type: z.literal('classify'),
  ...baseTask,
  statement: z.string(),
  categories: z
    .array(z.object({ id: z.string(), label: z.string(), description: z.string().optional() }))
    .min(MIN_CHOICES),
  items: z
    .array(z.object({ id: z.string(), text: z.string(), category: z.string(), explain: z.string().optional() }))
    .min(MIN_CHOICES),
  show: z.number().int().positive().optional(),
  passScore: z.number().min(0).max(1).default(DEFAULT_PASS_SCORE),
});

/** Put steps in the right order. `items` are listed in the CORRECT order; the UI shuffles them. */
export const orderTaskSchema = z.object({
  type: z.literal('order'),
  ...baseTask,
  statement: z.string(),
  items: z.array(z.string()).min(MIN_ORDER_ITEMS),
});

export const writtenFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.enum(['text', 'textarea', 'list']).default('textarea'),
  placeholder: z.string().optional(),
  hint: z.string().optional(),
});

/** Free-form written answer checked by field rules, followed by a model answer and a self-review checklist. */
export const writtenTaskSchema = z.object({
  type: z.literal('written'),
  ...baseTask,
  statement: z.string(),
  playground: z.string().optional(),
  fields: z.array(writtenFieldSchema).min(1),
  rules: z.array(fieldRuleSchema).default([]),
  model: z.record(z.union([z.string(), z.array(z.string())])),
  checklist: z.array(z.string()).default([]),
});

/**
 * Fill in a table: some columns are given (conditions, current state + event, test case),
 * the learner picks a value from a fixed list in every answer column (action, next state, requirement…).
 */
export const tableTaskSchema = z.object({
  type: z.literal('table'),
  ...baseTask,
  statement: z.string(),
  playground: z.string().optional(),
  givenColumns: z.array(z.string()).min(1),
  answerColumns: z
    .array(z.object({ id: z.string(), label: z.string(), options: z.array(z.string()).min(MIN_CHOICES) }))
    .min(1),
  rows: z
    .array(z.object({ given: z.array(z.string()), answers: z.record(z.string()), explain: z.string().optional() }))
    .min(1),
});

/**
 * Write CSS or XPath selectors for an HTML snippet. Target elements are marked in `html` with
 * `data-expect="<challenge id> …"`; the marker is removed before the learner sees or queries the snippet.
 */
export const selectorChallengeSchema = z.object({
  id: z.string(),
  /** What to select (Markdown). */
  prompt: z.string(),
  /** Reference selector — must match exactly the marked elements (checked by the validator). */
  model: z.string(),
  /** Optional require/forbid regexes on the selector text, e.g. forbid :nth-child. */
  rules: z.array(codeRuleSchema).default([]),
  explain: z.string().optional(),
});

export const selectorTaskSchema = z.object({
  type: z.literal('selector'),
  ...baseTask,
  statement: z.string(),
  syntax: z.enum(['css', 'xpath']),
  html: z.string(),
  challenges: z.array(selectorChallengeSchema).min(1),
});

/**
 * SQL practice on a SQLite database (sql.js). `database` names one or more scripts in content/databases/*.sql
 * (concatenated in order). A challenge with `verify` is a data-changing statement: the verify query runs after the
 * learner's statement and after the model statement, and the results must match.
 */
export const sqlChallengeSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  model: z.string(),
  verify: z.string().optional(),
  /** SELECT challenges: compare row order too (use when the prompt asks for ORDER BY). */
  orderMatters: z.boolean().default(false),
  rules: z.array(codeRuleSchema).default([]),
  explain: z.string().optional(),
});

export const sqlTaskSchema = z.object({
  type: z.literal('sql'),
  ...baseTask,
  statement: z.string(),
  database: z.union([z.string(), z.array(z.string()).min(1)]),
  challenges: z.array(sqlChallengeSchema).min(1),
});

/**
 * A real Playwright test (module 15+), run by the dev-server lab runner in Chromium against a Bug Playground page.
 * Files: starter.ts (starting spec), solution.ts (reference spec). The learner's tests must pass on the correct page
 * and fail on every page variant listed in `mutants` (ids = the page's bug flags, see registry.ts bugIds).
 */
export const playwrightTaskSchema = z.object({
  type: z.literal('playwright'),
  ...baseTask,
  statement: z.string(),
  playground: z.string(),
  mutants: z.array(mutantSchema).default([]),
  minTests: z.number().int().positive().optional(),
  codeRules: z.array(codeRuleSchema).default([]),
});

/**
 * Python code task, run in the browser with Pyodide. Files: starter.py, solution.py, tests.py; any other
 * *.py in the folder is a read-only support file. Tests are test_* functions (pytest style, a pytest subset is
 * available); a test's docstring is the hint shown when it fails. Tests mode: the learner writes tests.py for
 * subject.py, and they must fail on every mutants/<id>.py.
 */
export const pythonTaskSchema = z.object({
  type: z.literal('python'),
  ...baseTask,
  statement: z.string(),
  codeRules: z.array(codeRuleSchema).default([]),
  mode: z.enum(['solution', 'tests']).default('solution'),
  mutants: z.array(mutantSchema).default([]),
  /** tests mode: minimum number of collected test cases. */
  minTests: z.number().int().positive().optional(),
});

/** Questions per tech-check session when the task does not set `show`. */
export const DEFAULT_TECH_CHECK_SHOW = 12;
/** Soft time limit per tech-check question (seconds); the timer only warns. */
export const DEFAULT_TECH_CHECK_SECONDS = 120;

/** One open interview question: answered out loud, then self-assessed against its key points. */
export const techCheckQuestionSchema = z.object({
  id: z.string(),
  /** Slug of the module the question checks. A session only draws questions from modules of the current course. */
  module: z.string(),
  question: z.string(),
  /** Model answer of a strong junior (Markdown). */
  answer: z.string(),
  /** What the answer must cover; the learner ticks the points they actually said. */
  keyPoints: z.array(z.string()).min(1),
  /** A follow-up the interviewer would ask next — practised out loud, not scored. */
  followUp: z.object({ question: z.string(), answer: z.string() }).optional(),
});

/**
 * Tech check: an interview-style session of open questions with a timer. The learner answers out loud,
 * opens the model answer and ticks the key points they covered; the score is the share of key points.
 */
export const techCheckTaskSchema = z.object({
  type: z.literal('tech-check'),
  ...baseTask,
  intro: z.string().optional(),
  /** Questions per session, drawn at random from the pool (a retry draws a new set). */
  show: z.number().int().positive().default(DEFAULT_TECH_CHECK_SHOW),
  secondsPerQuestion: z.number().int().positive().default(DEFAULT_TECH_CHECK_SECONDS),
  passScore: z.number().min(0).max(1).default(DEFAULT_PASS_SCORE),
  questions: z.array(techCheckQuestionSchema).min(1),
});

export const taskSchema = z.discriminatedUnion('type', [
  quizTaskSchema,
  codeTaskSchema,
  valueSetTaskSchema,
  testCaseTaskSchema,
  bugReportTaskSchema,
  classifyTaskSchema,
  orderTaskSchema,
  writtenTaskSchema,
  tableTaskSchema,
  selectorTaskSchema,
  sqlTaskSchema,
  playwrightTaskSchema,
  pythonTaskSchema,
  techCheckTaskSchema,
]);

export type Resource = z.infer<typeof resourceSchema>;
export type Task = z.infer<typeof taskSchema>;
export type QuizTask = z.infer<typeof quizTaskSchema>;
export type QuizQuestion = z.infer<typeof questionSchema>;
export type CodeTask = z.infer<typeof codeTaskSchema>;
export type MutantSpec = z.infer<typeof mutantSchema>;
export type ValueSetTask = z.infer<typeof valueSetTaskSchema>;
export type TestCaseTask = z.infer<typeof testCaseTaskSchema>;
export type BugReportTask = z.infer<typeof bugReportTaskSchema>;
export type FieldRule = z.infer<typeof fieldRuleSchema>;
export type KnownBug = z.infer<typeof knownBugSchema>;
export type TestCaseModel = z.infer<typeof testCaseSchema>;
export type BugReportModel = z.infer<typeof bugReportSchema>;
export type ClassifyTask = z.infer<typeof classifyTaskSchema>;
export type OrderTask = z.infer<typeof orderTaskSchema>;
export type WrittenTask = z.infer<typeof writtenTaskSchema>;
export type WrittenField = z.infer<typeof writtenFieldSchema>;
export type TableTask = z.infer<typeof tableTaskSchema>;
export type SelectorTask = z.infer<typeof selectorTaskSchema>;
export type SelectorChallenge = z.infer<typeof selectorChallengeSchema>;
export type SqlTask = z.infer<typeof sqlTaskSchema>;
export type SqlChallenge = z.infer<typeof sqlChallengeSchema>;
export type PlaywrightTask = z.infer<typeof playwrightTaskSchema>;
export type PythonTask = z.infer<typeof pythonTaskSchema>;
export type TechCheckTask = z.infer<typeof techCheckTaskSchema>;
export type TechCheckQuestion = z.infer<typeof techCheckQuestionSchema>;

export const TASK_TYPE_LABEL: Record<Task['type'], string> = {
  quiz: 'Quiz',
  code: 'Code',
  'value-set': 'Test design',
  'test-case': 'Test case',
  'bug-report': 'Bug report',
  classify: 'Classify',
  order: 'Order',
  written: 'Written answer',
  table: 'Table',
  selector: 'Selectors',
  sql: 'SQL',
  playwright: 'Playwright',
  python: 'Python',
  'tech-check': 'Tech check',
};

export function formatZodError(err: z.ZodError): string {
  return err.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
}
