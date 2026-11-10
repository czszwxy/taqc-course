/**
 * Pure checking logic for structured answers (test cases, bug reports).
 * Shared by the UI and scripts/validate-content.ts.
 */
import type { FieldRule, KnownBug } from '../../content/schema';

export type FormValues = Record<string, string | string[]>;

const re = (pattern: string) => new RegExp(pattern, 'iu');
const asList = (v: FieldRule['value']): string[] => (Array.isArray(v) ? v : v === undefined ? [] : [String(v)]);

export function fieldText(values: FormValues, field: string): string {
  if (field === 'any') {
    return Object.values(values)
      .map((v) => (Array.isArray(v) ? v.join('\n') : v))
      .join('\n');
  }
  const v = values[field];
  return Array.isArray(v) ? v.join('\n') : (v ?? '');
}

export function evaluateRules(rules: FieldRule[], values: FormValues): string[] {
  const failures: string[] = [];
  for (const r of rules) {
    const text = fieldText(values, r.field).trim();
    let ok = true;
    switch (r.check) {
      case 'required':
        ok = text.length > 0;
        break;
      case 'minLength':
        ok = text.length >= Number(r.value);
        break;
      case 'minItems': {
        const v = values[r.field];
        const items = Array.isArray(v) ? v.filter((s) => s.trim()) : text.split('\n').filter((s) => s.trim());
        ok = items.length >= Number(r.value);
        break;
      }
      case 'mentionsAny':
        ok = asList(r.value).some((p) => re(p).test(text));
        break;
      case 'mentionsAll':
        ok = asList(r.value).every((p) => re(p).test(text));
        break;
      case 'notMentions':
        ok = !asList(r.value).some((p) => re(p).test(text));
        break;
      case 'equals':
        ok = text.toLowerCase() === String(r.value).toLowerCase();
        break;
      case 'oneOf':
        ok = asList(r.value).some((v) => v.toLowerCase() === text.toLowerCase());
        break;
    }
    if (!ok) failures.push(r.message);
  }
  return failures;
}

const VAGUE = '^(it )?(works?|ok|okay|good|correct|fine|працює|все працює|ок|добре|норм)\\.?$';
const VAGUE_BUG = "^(it )?(doesn.?t work|not working|broken|не працює|баг|bug|error|помилка|зламано)\\.?!?$";

export const TEST_CASE_BUILTIN_RULES: FieldRule[] = [
  {
    field: 'title',
    check: 'minLength',
    value: 10,
    message: 'Title is too short. Say what is checked and under which condition (at least 10 characters).',
  },
  { field: 'steps', check: 'minItems', value: 1, message: 'Add at least one step.' },
  { field: 'expectedResult', check: 'minLength', value: 5, message: 'Expected result is required: what exactly should happen?' },
  {
    field: 'expectedResult',
    check: 'notMentions',
    value: [VAGUE],
    message: 'Expected result is too vague ("works", "ok"). Describe the observable outcome: a message, a page, a value.',
  },
  { field: 'priority', check: 'required', message: 'Choose a priority.' },
  { field: 'type', check: 'required', message: 'Choose whether this is a positive or a negative test.' },
];

export const BUG_REPORT_BUILTIN_RULES: FieldRule[] = [
  {
    field: 'title',
    check: 'minLength',
    value: 15,
    message: 'Summary is too short. Say what is wrong, where and when — e.g. "Sign-up: age 18 is rejected although it is valid".',
  },
  {
    field: 'environment',
    check: 'required',
    message: 'Add the environment: browser + version and OS (e.g. "Chrome 131, Windows 11"). Bugs often depend on it.',
  },
  {
    field: 'steps',
    check: 'minItems',
    value: 2,
    message: 'Add at least 2 steps to reproduce — a developer must be able to repeat the bug without asking you.',
  },
  {
    field: 'actualResult',
    check: 'minLength',
    value: 10,
    message: 'Actual result is too short: describe exactly what happened (which message, which state).',
  },
  {
    field: 'actualResult',
    check: 'notMentions',
    value: [VAGUE_BUG],
    message: 'Actual result is vague ("doesn\'t work"). Write the observable behaviour: what you saw, which text, which value.',
  },
  {
    field: 'expectedResult',
    check: 'minLength',
    value: 10,
    message: 'Expected result is too short: what should have happened according to the requirements?',
  },
  { field: 'severity', check: 'required', message: 'Choose a severity (how bad the impact is).' },
  { field: 'priority', check: 'required', message: 'Choose a priority (how soon it should be fixed).' },
];

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export function checkTestCase(values: FormValues, rules: FieldRule[]): string[] {
  return [...evaluateRules(TEST_CASE_BUILTIN_RULES, values), ...evaluateRules(rules, values)];
}

export function checkBugReportQuality(values: FormValues): string[] {
  const failures = evaluateRules(BUG_REPORT_BUILTIN_RULES, values);
  const actual = norm(fieldText(values, 'actualResult'));
  if (actual && actual === norm(fieldText(values, 'expectedResult'))) {
    failures.push('Actual and expected results are the same — then it is not a bug. Actual = what happened, expected = what should happen.');
  }
  return failures;
}

export interface BugMatch {
  /** Newly found bug. */
  bug: KnownBug | null;
  /** The report describes a bug that was already reported. */
  duplicateOf: KnownBug | null;
}

const MATCH_FIELDS = ['title', 'steps', 'testData', 'actualResult', 'expectedResult'];
const PRIMARY_FIELDS = ['title', 'actualResult'];

/**
 * Finds which known bug a report describes. A bug is a candidate when ALL its regexes match the report;
 * among candidates we prefer the one whose patterns appear in the summary/actual result (most specific).
 */
export function matchBug(values: FormValues, bugs: KnownBug[], alreadyFound: string[]): BugMatch {
  const full = MATCH_FIELDS.map((f) => fieldText(values, f)).join('\n');
  const primary = PRIMARY_FIELDS.map((f) => fieldText(values, f)).join('\n');
  const candidates = bugs
    .filter((b) => b.match.every((p) => re(p).test(full)))
    .map((b) => ({ b, score: b.match.filter((p) => re(p).test(primary)).length / b.match.length }))
    .sort((x, y) => y.score - x.score || Number(alreadyFound.includes(x.b.id)) - Number(alreadyFound.includes(y.b.id)));
  const best = candidates[0];
  if (!best) return { bug: null, duplicateOf: null };
  if (alreadyFound.includes(best.b.id)) {
    const fresh = candidates.find((c) => c.score === best.score && !alreadyFound.includes(c.b.id));
    return fresh ? { bug: fresh.b, duplicateOf: null } : { bug: null, duplicateOf: best.b };
  }
  return { bug: best.b, duplicateOf: null };
}
