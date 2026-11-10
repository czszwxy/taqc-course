import type { ReactNode } from 'react';
import type { CourseTask } from '../../content/loader';

export interface TaskViewProps {
  /** The task being shown (main task or one of its similar variants). */
  ct: CourseTask;
  main: CourseTask;
  /** Seed for generated tasks (quiz sampling, value-set generators). */
  seed: number;
  header: ReactNode;
  onSimilar?: () => void;
  next?: { to: string; label: string };
}
