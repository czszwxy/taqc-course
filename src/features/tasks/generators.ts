/**
 * Generators for "value-set" tasks. seed 0 = the task's own params; any other seed = a new similar task.
 * Pure: used by the UI and scripts/validate-content.ts.
 */
import { mulberry32 } from '../../lib/random';

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

const RANGE_PRESETS: RangeField[] = [
  { field: 'Age', min: 18, max: 65, unit: 'роки' },
  { field: 'Password length', min: 8, max: 20, unit: 'символів' },
  { field: 'Quantity', min: 1, max: 99, unit: 'шт.' },
  { field: 'Discount', min: 5, max: 50, unit: '%' },
  { field: 'Username length', min: 3, max: 16, unit: 'символів' },
  { field: 'Rating', min: 1, max: 5, unit: 'зірок' },
  { field: 'Number of guests', min: 1, max: 12 },
  { field: 'Delivery days', min: 2, max: 14, unit: 'днів' },
  { field: 'Monthly payment', min: 100, max: 5000, unit: 'грн' },
];

function pickRange(params: Record<string, unknown>, seed: number): RangeField {
  if (seed === 0 && typeof params.min === 'number' && typeof params.max === 'number') {
    return { field: String(params.field ?? 'Value'), min: params.min, max: params.max, unit: params.unit as string | undefined };
  }
  const rng = mulberry32(seed * 2654435761);
  const pool = RANGE_PRESETS.filter((p) => p.field !== params.field);
  return pool[Math.floor(rng() * pool.length)];
}

const bvaRange: Generator = (params, seed) => {
  const threeValue = params.approach === 'three-value';
  const { field, min, max, unit } = pickRange(params, seed);
  const expected = threeValue ? [min - 1, min, min + 1, max - 1, max, max + 1] : [min - 1, min, max, max + 1];
  const name = threeValue ? '3-value' : '2-value';

  const statement = [
    `Вимога: поле **${field}** приймає цілі числа від **${min}** до **${max}** включно${unit ? ` (${unit})` : ''}.`,
    '',
    `Застосуй **${name} boundary value analysis** і введи **всі** значення, які треба перевірити (через кому або пробіл).`,
  ].join('\n');

  const feedback = (answer: number[]) => {
    const msgs: string[] = [];
    const set = new Set(answer);
    for (const b of [min, max]) {
      if (!set.has(b)) {
        msgs.push(`Не перевіряєш саму межу **${b}**. Межа — валідне значення, і саме тут ховаються помилки на кшталт \`>\` замість \`>=\`.`);
      }
    }
    for (const b of [min - 1, max + 1]) {
      if (!set.has(b)) msgs.push(`Не вистачає першого невалідного значення за межею: **${b}**.`);
    }
    if (threeValue) {
      for (const b of [min + 1, max - 1]) {
        if (!set.has(b)) msgs.push(`У 3-value BVA треба ще значення одразу всередині межі: **${b}**.`);
      }
    }
    for (const v of answer) {
      if (expected.includes(v)) continue;
      if (v > min && v < max) {
        msgs.push(`**${v}** — значення з середини діапазону. Воно для equivalence partitioning, а не для BVA.`);
      } else {
        msgs.push(`**${v}** не сусідить з межею, тому для ${name} BVA воно зайве.`);
      }
    }
    return msgs;
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

export const GENERATORS: Record<string, Generator> = {
  'bva-range': bvaRange,
};

export function parseNumberList(input: string): { values: number[]; invalid: string[] } {
  const tokens = input.split(/[\s,;]+/).filter(Boolean);
  const values: number[] = [];
  const invalid: string[] = [];
  for (const t of tokens) {
    const n = Number(t);
    if (Number.isFinite(n)) {
      if (!values.includes(n)) values.push(n);
    } else invalid.push(t);
  }
  return { values, invalid };
}
