import { course } from '../content/loader';

/** Position of the module's track in the course outline — drives the track colour (`trackClass`). */
export function trackIndexOf(moduleSlug: string): number {
  return Math.max(0, course.tracks.findIndex((t) => t.modules.some((m) => m.slug === moduleSlug)));
}
