/**
 * Generators for "value-set" tasks. seed 0 = the task's own params; any other seed = a new similar task.
 * Pure: used by the UI and scripts/validate-content.ts.
 */
import { mulberry32 } from '../../lib/random';
import rangePresets from './range-presets.json';

export interface ValueSetProblem {
  statement: string;
  expected: number[];
  /** Explains what's wrong with an answer (empty array = correct). */
  feedback: (answer: number[]) => string[];
  answerNote: string;
}

type Generator = (params: Record<string, unknown>, seed: number) => ValueSetProblem;

interface RangeField {
  field: string;
  min: number;
  max: number;
  unit?: string;
}

const RANGE_PRESETS: RangeField[] = rangePresets;

/** Knuth's multiplicative hash constant: spreads consecutive seeds across the preset list. */
const SEED_SPREAD = 2654435761;
/** Used to find the middle of a range for a typical valid representative. */
const MIDPOINT_DIVISOR = 2;

function pickRange(params: Record<string, unknown>, seed: number): RangeField {
  if (seed === 0 && typeof params.min === 'number' && typeof params.max === 'number') {
    return { field: String(params.field ?? 'Value'), min: params.min, max: params.max, unit: params.unit as string | undefined };
  }
  const rng = mulberry32(seed * SEED_SPREAD);
  const pool = RANGE_PRESETS.filter((p) => p.field !== params.field);
  return pool[Math.floor(rng() * pool.length)];
}

function requirementLine({ field, min, max, unit }: RangeField): string {
  const unitText = unit ? ` (${unit})` : '';
  return `Вимога: поле **${field}** приймає цілі числа від **${min}** до **${max}** включно${unitText}.`;
}

/* ---------- Boundary value analysis ---------- */

const bvaRange: Generator = (params, seed) => {
  const threeValue = params.approach === 'three-value';
  const range = pickRange(params, seed);
  const { min, max } = range;
  const edges = [min, max];
  const outer = [min - 1, max + 1];
  const inner = threeValue ? [min + 1, max - 1] : [];
  const expected = [...outer, ...edges, ...inner].sort((a, b) => a - b);
  const name = threeValue ? '3-value' : '2-value';

  const statement = [
    requirementLine(range),
    '',
    `Застосуй **${name} boundary value analysis** і введи **всі** значення, які треба перевірити (через кому або пробіл).`,
  ].join('\n');

  const extraMessage = (v: number): string =>
    v > min && v < max
      ? `**${v}** — значення з середини діапазону. Воно для equivalence partitioning, а не для BVA.`
      : `**${v}** не сусідить з межею, тому для ${name} BVA воно зайве.`;

  const feedback = (answer: number[]): string[] => {
    const set = new Set(answer);
    return [
      ...edges
        .filter((b) => !set.has(b))
        .map((b) => `Не перевіряєш саму межу **${b}**. Межа — валідне значення, і саме тут ховаються помилки на кшталт \`>\` замість \`>=\`.`),
      ...outer.filter((b) => !set.has(b)).map((b) => `Не вистачає першого невалідного значення за межею: **${b}**.`),
      ...inner.filter((b) => !set.has(b)).map((b) => `У 3-value BVA треба ще значення одразу всередині межі: **${b}**.`),
      ...answer.filter((v) => !expected.includes(v)).map(extraMessage),
    ];
  };

  return {
    statement,
    expected,
    feedback,
    answerNote: threeValue
      ? `Для кожної межі беремо 3 значення: перед межею, саму межу і після неї → ${expected.join(', ')}.`
      : `Для кожної межі беремо саму межу і найближче значення за нею → ${expected.join(', ')}.`,
  };
};

/* ---------- Equivalence partitioning ---------- */

interface Partition {
  name: string;
  contains: (v: number) => boolean;
}

const epRange: Generator = (params, seed) => {
  const range = pickRange(params, seed);
  const { min, max } = range;
  const partitions: Partition[] = [
    { name: `менше ${min} (невалідний)`, contains: (v) => v < min },
    { name: `від ${min} до ${max} (валідний)`, contains: (v) => v >= min && v <= max },
    { name: `більше ${max} (невалідний)`, contains: (v) => v > max },
  ];
  const middle = Math.round((min + max) / MIDPOINT_DIVISOR);
  const expected = [min - 1, middle, max + 1];

  const statement = [
    requirementLine(range),
    '',
    'Застосуй **equivalence partitioning** до числових цілих значень: введи **по одному** представнику з **кожного** класу еквівалентності — валідного й невалідних (через кому або пробіл).',
  ].join('\n');

  const feedback = (answer: number[]): string[] => {
    const missing = partitions
      .filter((p) => !answer.some(p.contains))
      .map((p) => `Немає представника з класу **${p.name}**.`);
    const duplicates = partitions
      .map((p) => ({ p, values: answer.filter(p.contains) }))
      .filter(({ values }) => values.length > 1)
      .map(({ p, values }) => `**${values.join(', ')}** — з одного класу (${p.name}). Для EP досить **одного** представника: решта перевіряє те саме.`);
    const fractional = answer
      .filter((v) => !Number.isInteger(v))
      .map((v) => `**${v}** — не ціле число. Це окремий невалідний клас, але в цій задачі рахуємо лише цілі значення.`);
    return [...missing, ...duplicates, ...fractional];
  };

  return {
    statement,
    expected,
    feedback,
    answerNote: `Три класи: менше ${min}, від ${min} до ${max}, більше ${max}. Підходить будь-який представник кожного класу, наприклад ${expected.join(', ')}. Межі між класами потім уточнюють за допомогою BVA.`,
  };
};

export const GENERATORS: Record<string, Generator> = {
  'bva-range': bvaRange,
  'ep-range': epRange,
};

/**
 * Separators between numbers in the learner's answer: any run of whitespace, commas or semicolons.
 * Splits "17, 18;65  66" into ["17", "18", "65", "66"]; keeps "-1" and "2.5" intact.
 * Try it: https://regex101.com/?regex=%5B%5Cs%2C%3B%5D%2B&testString=17%2C%2018%3B65%20%2066&flavor=javascript
 */
const NUMBER_SEPARATORS = /[\s,;]+/;

export function parseNumberList(input: string): { values: number[]; invalid: string[] } {
  const tokens = input.split(NUMBER_SEPARATORS).filter(Boolean);
  const numbers = tokens.map(Number).filter(Number.isFinite);
  return {
    values: numbers.filter((n, i) => numbers.indexOf(n) === i),
    invalid: tokens.filter((t) => !Number.isFinite(Number(t))),
  };
}
