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
  {
    id: 'login',
    title: 'Login page',
    path: '/playground/login',
    description: 'Sign-in with test accounts, lockout after failed attempts, show password, remember me and forgot password.',
    bugs: 6,
  },
  {
    id: 'cart',
    title: 'Shopping cart',
    path: '/playground/cart',
    description: 'Quantities, promo codes, member and free-shipping rules, totals and checkout.',
    bugs: 6,
  },
  {
    id: 'search',
    title: 'Search & filters',
    path: '/playground/search',
    description: 'Product catalog with text search, category, price range, in-stock filter, sorting and a result counter.',
    bugs: 6,
  },
  {
    id: 'order',
    title: 'Order status flow',
    path: '/playground/order',
    description: 'Admin actions that move an order through Created → Paid → Shipped → Delivered, plus Cancel and Return.',
    bugs: 5,
  },
  {
    id: 'todo',
    title: 'To-do list',
    path: '/playground/todo',
    description: 'Add, edit, complete, filter and delete tasks; counter, Clear completed and saving between reloads.',
    bugs: 6,
  },
];
