import type { PlaywrightTask } from '../../content/schema';
import type { LabProjectResult, LabRunResult, LabTestResult } from '../../../server/lab-types';
import { evaluateCodeRules } from '../../runner/client';

/** Pure grading of a Playwright lab run. Used by the task view and by scripts/validate-lab.ts. */

export type LabRunOk = Extract<LabRunResult, { ok: true }>;

export interface MutantOutcome {
  id: string;
  caught: boolean;
  description: string;
  hint: string;
}

export interface PlaywrightGrade {
  passed: boolean;
  /** The learner's tests on the correct page. */
  correct: LabTestResult[];
  greenOnCorrect: boolean;
  mutants: MutantOutcome[];
  tooFewTests: boolean;
  ruleFailures: string[];
  /** Problems loading the spec (syntax error, no tests found…). */
  errors: string[];
}

const FAILED_STATUSES: ReadonlySet<LabTestResult['status']> = new Set<LabTestResult['status']>(['failed', 'timedOut', 'interrupted']);

/** A bug is caught when at least one test fails on the page variant with that bug. */
function caught(project: LabProjectResult | undefined): boolean {
  return project !== undefined && project.tests.some((t) => FAILED_STATUSES.has(t.status));
}

export function gradeLabRun(task: PlaywrightTask, code: string, run: LabRunOk): PlaywrightGrade {
  const correct = run.projects.find((p) => p.bug === null)?.tests ?? [];
  const greenOnCorrect = run.errors.length === 0 && correct.length > 0 && correct.every((t) => t.status === 'passed');
  const mutants = task.mutants.map((m) => ({ ...m, caught: caught(run.projects.find((p) => p.bug === m.id)) }));
  const tooFewTests = task.minTests !== undefined && correct.length < task.minTests;
  const ruleFailures = evaluateCodeRules(code, task.codeRules);
  return {
    passed: greenOnCorrect && mutants.every((m) => m.caught) && !tooFewTests && ruleFailures.length === 0,
    correct,
    greenOnCorrect,
    mutants,
    tooFewTests,
    ruleFailures,
    errors: run.errors,
  };
}
