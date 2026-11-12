import type { TechCheckQuestion, TechCheckTask } from '../../content/schema';
import type { Course } from '../../content/loader';
import { formatModuleNumber } from '../../lib/format';
import { hashString, mulberry32, shuffle } from '../../lib/random';

/** Spreads seeds apart so "New set of questions" draws a visibly different session. */
const SEED_STEP = 7919;
const PERCENT = 100;

/** Question id → indexes of the key points the learner said. */
export type Ticks = Record<string, number[]>;
/** Question id → the learner's optional notes. */
export type Notes = Record<string, string>;

export interface TopicResult {
  slug: string;
  label: string;
  score: number;
  count: number;
}

/** Questions about modules of the course (the whole bank when the course is unknown). */
export function questionPool(task: TechCheckTask, course: Course | undefined): TechCheckQuestion[] {
  if (!course) return task.questions;
  return task.questions.filter((q) => course.modulesBySlug.has(q.module));
}

const modulePosition = (slug: string, course: Course | undefined): number => course?.modulesBySlug.get(slug)?.number ?? 0;

/** Module slugs of the questions in course order. */
export function topicSlugs(questions: TechCheckQuestion[], course: Course | undefined): string[] {
  return [...new Set(questions.map((q) => q.module))].sort((a, b) => modulePosition(a, course) - modulePosition(b, course));
}

/**
 * A random session of `show` questions that covers the topics evenly: questions are taken round-robin from every
 * module (in random module order, so a different module gets the extra questions each time), then ordered by module
 * so the talk goes topic by topic.
 */
export function drawSession(pool: TechCheckQuestion[], show: number, taskId: string, seed: number, course: Course | undefined): TechCheckQuestion[] {
  const rng = mulberry32(hashString(taskId) + seed * SEED_STEP);
  const shuffled = shuffle(pool, rng);
  const modules = shuffle([...new Set(shuffled.map((q) => q.module))], rng);
  const queues = modules.map((slug) => shuffled.filter((q) => q.module === slug));
  const rounds = Math.max(0, ...queues.map((queue) => queue.length));
  const balanced = Array.from({ length: rounds }, (_, round) => queues.flatMap((queue) => queue.slice(round, round + 1)));
  const picked = balanced.flat().slice(0, Math.min(show, pool.length));
  return [...picked].sort((a, b) => modulePosition(a.module, course) - modulePosition(b.module, course));
}

export function topicLabel(slug: string, course: Course | undefined): string {
  const m = course?.modulesBySlug.get(slug);
  return m ? `Module ${formatModuleNumber(m.number)} · ${m.title}` : slug;
}

export const toPercent = (share: number): number => Math.round(share * PERCENT);

export const questionScore = (q: TechCheckQuestion, ticks: Ticks): number => (ticks[q.id]?.length ?? 0) / q.keyPoints.length;

export function sessionScore(questions: TechCheckQuestion[], ticks: Ticks): number {
  if (questions.length === 0) return 0;
  return questions.reduce((sum, q) => sum + questionScore(q, ticks), 0) / questions.length;
}

export function topicResults(questions: TechCheckQuestion[], ticks: Ticks, course: Course | undefined): TopicResult[] {
  return topicSlugs(questions, course).map((slug) => {
    const own = questions.filter((q) => q.module === slug);
    return { slug, label: topicLabel(slug, course), score: sessionScore(own, ticks), count: own.length };
  });
}

const oneLine = (text: string): string =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');

const topicsOf = (questions: TechCheckQuestion[], course: Course | undefined): string[] =>
  topicSlugs(questions, course).map((slug) => topicLabel(slug, course));

function bankEntry(q: TechCheckQuestion, n: number, course: Course | undefined): string {
  return [
    `${n}. [${topicLabel(q.module, course)}] ${oneLine(q.question)}`,
    `   Key points: ${q.keyPoints.join('; ')}`,
    `   Reference answer: ${oneLine(q.answer)}`,
    ...(q.followUp ? [`   Possible follow-up: ${oneLine(q.followUp.question)}`] : []),
  ].join('\n');
}

/** A prompt that makes Claude run this tech check as a live interviewer. */
export function claudePrompt(pool: TechCheckQuestion[], count: number, course: Course | undefined): string {
  const role = course?.title ?? 'QA Engineer';
  return [
    `You are a technical interviewer at an IT company. Run a tech check for a candidate for a junior ${role} position.`,
    `Topics: ${topicsOf(pool, course).join(', ')}.`,
    '',
    'How to run it:',
    `- Ask ${count} questions from the bank below in random order, mixing topics. You may rephrase them as a real interviewer would.`,
    '- Ask ONE question at a time and wait for my answer. Never show a reference answer before I answer.',
    '- If my answer is vague or incomplete, ask one follow-up question to dig deeper (the bank suggests some).',
    '- After each answer give 1–3 sentences: what was good and which key points were missing. Then ask the next question.',
    '- At the end give a score from 0 to 10 for each topic, name my 3 weakest topics with what to repeat, and say honestly whether this would pass a junior tech check.',
    '- Talk to me in Ukrainian and keep technical terms in English. If I write "English", switch to English for the rest of the interview.',
    '',
    'Question bank (key points and reference answers are for you only):',
    '',
    pool.map((q, i) => bankEntry(q, i + 1, course)).join('\n\n'),
    '',
    'Start with a short greeting and the first question.',
  ].join('\n');
}

function mentorEntry(q: TechCheckQuestion, n: number): string {
  return [
    `${n}. **${oneLine(q.question)}**`,
    ...q.keyPoints.map((p) => `   - ${p}`),
    `   - _Reference:_ ${oneLine(q.answer)}`,
    ...(q.followUp ? [`   - _Follow-up:_ ${oneLine(q.followUp.question)}`] : []),
  ].join('\n');
}

/** Questions with key points for a mentor or a friend who plays the interviewer. */
export function mentorSheet(title: string, pool: TechCheckQuestion[], count: number, course: Course | undefined): string {
  const sections = topicSlugs(pool, course).map((slug) => {
    const own = pool.filter((q) => q.module === slug);
    return [`## ${topicLabel(slug, course)}`, '', own.map((q, i) => mentorEntry(q, i + 1)).join('\n\n')].join('\n');
  });
  return [
    `# ${title} — questions for the interviewer`,
    '',
    `Ask about ${count} questions, one at a time, mixing topics. Let the candidate answer out loud for 1–2 minutes, ask a follow-up when the answer is vague, and compare it with the key points. Score each answer: all key points — 1, about half — 0.5, none — 0.`,
    '',
    sections.join('\n\n'),
  ].join('\n');
}

function reviewEntry(q: TechCheckQuestion, n: number, ticks: Ticks, notes: Notes): string {
  const said = ticks[q.id] ?? [];
  return [
    `### ${n}. ${oneLine(q.question)}`,
    `My notes: ${notes[q.id]?.trim() || '(answered out loud, no notes)'}`,
    ...q.keyPoints.map((p, i) => `- ${said.includes(i) ? '✓' : '✗'} ${p}`),
    `Reference answer: ${oneLine(q.answer)}`,
  ].join('\n');
}

/** Results bundle for "Copy for review": what was said, what was missed. */
export function reviewBundle(title: string, questions: TechCheckQuestion[], ticks: Ticks, notes: Notes): string {
  return [
    `# Tech check review: ${title}`,
    '',
    `My self-assessed score: ${toPercent(sessionScore(questions, ticks))}% (share of key points I covered).`,
    '',
    questions.map((q, i) => reviewEntry(q, i + 1, ticks, notes)).join('\n\n'),
    '',
    'Please review: which of my answers would not convince an interviewer, how to phrase the missed key points in simple words, and ask me 3 more questions on my weakest topic — one at a time.',
  ].join('\n');
}
