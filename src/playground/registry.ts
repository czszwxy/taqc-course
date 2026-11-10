export interface PlaygroundPage {
  id: string;
  title: string;
  path: string;
  description: string;
  bugs: number;
}

/** Intentionally buggy demo pages. Add `?fixed` to a page URL to get the bug-free version (used later by automation labs). */
export const PLAYGROUND_PAGES: PlaygroundPage[] = [
  {
    id: 'signup',
    title: 'Sign-up form',
    path: '/playground/signup',
    description: 'Account registration with validation rules for name, email, age, password, country and terms.',
    bugs: 7,
  },
];
