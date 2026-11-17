import type { CodeRule } from './client';

/** Code rules of Python tasks — pure, so the validator (Node) and the lab grading share them with the app. */

/** Drops "# comments" (outside string literals) so code rules only look at code. */
export function stripPythonComments(code: string): string {
  return code
    .split('\n')
    .map((line) => {
      const state = [...line].reduce<{ quote: string | null; cut: number }>(
        (acc, ch, i) => {
          if (acc.cut >= 0) return acc;
          if (acc.quote) return ch === acc.quote ? { ...acc, quote: null } : acc;
          if (ch === '"' || ch === "'") return { ...acc, quote: ch };
          return ch === '#' ? { ...acc, cut: i } : acc;
        },
        { quote: null, cut: -1 },
      );
      return state.cut >= 0 ? line.slice(0, state.cut) : line;
    })
    .join('\n');
}

export function evaluatePythonRules(code: string, rules: CodeRule[]): string[] {
  const clean = stripPythonComments(code);
  return rules
    .filter((r) => {
      // The pattern comes from task.json codeRules, e.g. "for\s+\w+\s+in" accepts "for item in items" and rejects "while True:".
      // Try one: https://regex101.com/?regex=for%5Cs%2B%5Cw%2B%5Cs%2Bin&testString=for%20item%20in%20items&flavor=javascript
      const found = new RegExp(r.pattern, r.flags ?? 'm').test(clean);
      return (r.kind === 'require' && !found) || (r.kind === 'forbid' && found);
    })
    .map((r) => r.message);
}
