import { catalog, courseForModule, getCourse, DEFAULT_COURSE_ID, type Course } from '../content/loader';
import { useSettings } from '../features/progress/store';

/** The course the learner is studying (last opened course map), falling back to the default course. */
export function useCurrentCourse(): Course | undefined {
  const id = useSettings((s) => s.currentCourseId);
  return getCourse(id) ?? getCourse(DEFAULT_COURSE_ID) ?? catalog.courses[0];
}

/** Course for a module or lesson page: the current course when it lists the module, otherwise the first that does. */
export function useCourseForModule(moduleSlug: string | undefined): Course | undefined {
  const id = useSettings((s) => s.currentCourseId);
  return moduleSlug ? courseForModule(moduleSlug, id ?? DEFAULT_COURSE_ID) : undefined;
}
