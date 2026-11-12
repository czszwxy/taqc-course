import type { Course } from '../content/loader';

/** Position of the module's track in the course outline — drives the track colour (`trackClass`). */
export function trackIndexOf(course: Course | undefined, moduleSlug: string): number {
  return Math.max(0, course?.tracks.findIndex((t) => t.modules.some((m) => m.slug === moduleSlug)) ?? 0);
}
