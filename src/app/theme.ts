import { flushSync } from 'react-dom';
import { useSettings, type Theme } from '../features/progress/store';

/**
 * Switches paper ↔ blueprint with a short cross-fade (View Transitions API, the browser's default 250 ms fade)
 * instead of a hard cut of every colour at once. Browsers without the API switch instantly. The class and the store
 * change inside the transition, so its "after" picture already has the new theme and the new toggle icon.
 * The fade has no movement, so it stays on with reduced motion.
 */
export function switchTheme(next: Theme): void {
  const apply = (): void => {
    document.documentElement.classList.toggle('dark', next === 'dark');
    flushSync(() => useSettings.getState().setTheme(next));
  };
  if (typeof document.startViewTransition === 'function') document.startViewTransition(apply);
  else apply();
}
