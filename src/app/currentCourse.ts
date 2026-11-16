import { useEffect } from 'react';
import { catalog, courseForModule, getCourse, DEFAULT_COURSE_ID, type Course } from '../content/loader';
import { useSettings } from '../features/progress/store';

/** The course the learner is studying (last opened course map), falling back to the default course. */
export function useCurrentCourse(): Course | undefined {
  const id = useSettings((s) => s.currentCourseId);
  return getCourse(id) ?? getCourse(DEFAULT_COURSE_ID) ?? catalog.courses[0];
}

/**
 * Course for a module or lesson page: the current course when it lists the module, otherwise the first that does.
 * Opening a module of another course makes that course the current one, so the top bar counter and the
 * "course map" links follow the page the learner is on.
 */
export function useCourseForModule(moduleSlug: string | undefined): Course | undefined {
  const id = useSettings((s) => s.currentCourseId) ?? DEFAULT_COURSE_ID;
  const setCurrentCourse = useSettings((s) => s.setCurrentCourse);
  const course = moduleSlug ? courseForModule(moduleSlug, id) : undefined;
  useEffect(() => {
    if (course && course.id !== id) setCurrentCourse(course.id);
  }, [course, id, setCurrentCourse]);
  return course;
}
