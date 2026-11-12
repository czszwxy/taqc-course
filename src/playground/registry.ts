export interface PlaygroundPage {
  id: string;
  title: string;
  path: string;
  description: string;
  bugs: number;
  /**
   * Keys of the page's getBugs() flags, in the same order. Playwright tasks use them as mutant ids: the lab runner
   * turns on exactly one of them per run (see withLabMode in PlaygroundShell). Keep in sync with the page.
   */
  bugIds?: string[];
}

/** Intentionally buggy demo pages. Add `?fixed` to a page URL to get the bug-free version (used later by automation labs). */
export const PLAYGROUND_PAGES: PlaygroundPage[] = [
  {
    id: 'signup',
    title: 'Sign-up form',
    path: '/playground/signup',
    description: 'Account registration with validation rules for name, email, age, password, country and terms.',
    bugs: 7,
    bugIds: ['nameSpaces', 'emailDot', 'age18', 'pwdMax', 'confirm', 'terms', 'greeting'],
  },
  {
    id: 'login',
    title: 'Login page',
    path: '/playground/login',
    description: 'Sign-in with test accounts, lockout after failed attempts, show password, remember me and forgot password.',
    bugs: 6,
    bugIds: ['emailCase', 'emailSpaces', 'lockout', 'lockedLogin', 'rememberMe', 'forgotEmpty'],
  },
  {
    id: 'cart',
    title: 'Shopping cart',
    path: '/playground/cart',
    description: 'Quantities, promo codes, member and free-shipping rules, totals and checkout.',
    bugs: 6,
    bugIds: ['qtyZero', 'promoCase', 'shippingBoundary', 'removeLast', 'promoTwice', 'memberWithPromo'],
  },
  {
    id: 'search',
    title: 'Search & filters',
    path: '/playground/search',
    description: 'Product catalog with text search, category, price range, in-stock filter, sorting and a result counter.',
    bugs: 6,
    bugIds: ['searchCase', 'maxExclusive', 'sortAsText', 'countIgnoresStock', 'clearKeepsSearch', 'addOutOfStock'],
  },
  {
    id: 'order',
    title: 'Order status flow',
    path: '/playground/order',
    description: 'Admin actions that move an order through Created → Paid → Shipped → Delivered, plus Cancel and Return.',
    bugs: 5,
    bugIds: ['shipBeforePay', 'cancelAfterShip', 'payAfterCancel', 'returnRejected', 'refundNote'],
  },
  {
    id: 'todo',
    title: 'To-do list',
    path: '/playground/todo',
    description: 'Add, edit, complete, filter and delete tasks; counter, Clear completed and saving between reloads.',
    bugs: 6,
    bugIds: ['maxLength', 'plural', 'counterAfterDelete', 'clearAll', 'escSaves', 'doneNotSaved'],
  },
  {
    id: 'devtools',
    title: 'DevTools Lab',
    path: '/playground/devtools',
    description: 'Practice page for the Elements, Console, Network and Application panels: hidden values, console errors, requests and storage.',
    bugs: 6,
    bugIds: ['totalCrash', 'promoClientOnly', 'newsletterFalse', 'ordersFilter', 'avatar404', 'logoutKeepsCart'],
  },
  {
    id: 'responsive',
    title: 'Product page (responsive)',
    path: '/playground/responsive',
    description: 'A product page to test at different screen widths with the DevTools device toolbar.',
    bugs: 4,
    bugIds: ['navGap', 'titleNoWrap', 'cartHiddenMobile', 'tableOverflow'],
  },
  {
    id: 'api',
    title: 'Gadgetly API console',
    path: '/playground/api',
    description: 'A mini Postman inside the app for the local Gadgetly REST API: products, login with a token, orders CRUD.',
    bugs: 6,
  },
  {
    id: 'account',
    title: 'My account',
    path: '/playground/account',
    description: 'Signed-in area: session in localStorage, orders from the API, confirm/prompt/alert dialogs, a help chat in an iframe and a link that opens a new tab.',
    bugs: 8,
    bugIds: ['sessionLost', 'signOutKeepsToken', 'renameEmpty', 'deleteIgnoresCancel', 'termsSameTab', 'ordersErrorAsEmpty', 'retryNoop', 'helpEmpty'],
  },
];
