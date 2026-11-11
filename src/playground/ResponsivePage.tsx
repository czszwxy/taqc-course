import { useState } from 'react';
import { PlaygroundShell, formatUah, isFixedMode, withLabMode } from './PlaygroundShell';

/**
 * Bug Playground: Gadgetly product page for responsive testing, with 4 INTENTIONAL layout bugs that
 * appear only at some screen widths (catalogued in
 * content/modules/07-how-the-web-works/lessons/08-responsive-cross-browser/tasks/03-bug-hunt/task.json).
 * Open with `?fixed` for the correct layout. Keep this file and the bug catalog in sync.
 */

const PRICE = 8999;
const NAV_LINKS = ['Catalog', 'Deals', 'Support', 'Account'];
const SPECS: [string, string][] = [
  ['Noise cancelling', 'Active, 3 levels'],
  ['Battery life', 'Up to 40 hours (ANC off), 30 hours (ANC on)'],
  ['Charging', 'USB-C, 10 minutes = 5 hours of music'],
  ['Bluetooth', '5.3, multipoint (2 devices)'],
  ['Weight', '254 g'],
  ['In the box', 'Headphones, hard case, USB-C cable, 3.5 mm audio cable'],
];

function getBugs(fixed: boolean) {
  const on = !fixed;
  return {
    navGap: on, // 768–1023 px: neither the nav links nor the ☰ button are shown
    titleNoWrap: on, // < 640 px: the long title does not wrap and is cut off
    cartHiddenMobile: on, // < 640 px: "Add to cart" is hidden
    tableOverflow: on, // < 640 px: the specs table is wider than the screen → horizontal page scroll
  };
}

/** Tailwind classes per element: [buggy, fixed]. */
const CLASSES = {
  navLinks: ['hidden lg:flex', 'hidden md:flex'],
  title: ['overflow-hidden whitespace-nowrap sm:whitespace-normal', 'break-words'],
  cartButton: ['hidden sm:inline-flex', 'inline-flex'],
  tableWrap: ['', 'overflow-x-auto'],
  table: ['min-w-[640px]', 'w-full'],
} as const;

function pick(classes: readonly [string, string], buggy: boolean): string {
  const [whenBuggy, whenFixed] = classes;
  return buggy ? whenBuggy : whenFixed;
}

export function ResponsivePage() {
  const fixed = isFixedMode();
  const bug = withLabMode(getBugs(fixed));
  const [menuOpen, setMenuOpen] = useState(false);
  const [added, setAdded] = useState(false);

  const requirements = (
    <>
      <li>
        Supported widths: <b>320 px and wider</b> — phones, tablets and desktops, portrait and landscape.
      </li>
      <li>
        The page never scrolls <b>horizontally</b>.
      </li>
      <li>
        Navigation is always available: links on wide screens (768 px and up), the <b>☰ menu</b> on narrow screens.
      </li>
      <li>
        <b>Add to cart</b> is visible on every device.
      </li>
      <li>Long product names wrap to the next line and are fully readable.</li>
      <li>The specs table fits the screen (on small screens it may scroll inside its own box).</li>
      <li>Use DevTools → Toggle device toolbar (Ctrl+Shift+M) to change the width.</li>
    </>
  );

  return (
    <PlaygroundShell brand="gadgetly" fixed={fixed} requirements={requirements}>
      <nav className="flex items-center justify-between border-b border-slate-200 pb-3" aria-label="Shop navigation" data-testid="shop-nav">
        <span className="font-bold text-orange-600">Gadgetly Store</span>
        <ul className={`${pick(CLASSES.navLinks, bug.navGap)} gap-5 text-sm`} data-testid="nav-links">
          {NAV_LINKS.map((l) => (
            <li key={l}>
              <a href="#product" className="hover:text-orange-600">
                {l}
              </a>
            </li>
          ))}
        </ul>
        <button type="button" aria-label="Open menu" data-testid="menu-button" onClick={() => setMenuOpen(!menuOpen)} className="rounded-md border border-slate-300 px-2.5 py-1 md:hidden">
          ☰
        </button>
      </nav>
      {menuOpen && (
        <ul className="mt-2 space-y-1 rounded-md border border-slate-200 p-2 text-sm md:hidden" data-testid="mobile-menu">
          {NAV_LINKS.map((l) => (
            <li key={l}>
              <a href="#product" className="block rounded px-2 py-1 hover:bg-slate-50">
                {l}
              </a>
            </li>
          ))}
        </ul>
      )}

      <article id="product" className="mt-5 grid gap-6 md:grid-cols-2">
        <div className="aspect-square rounded-xl bg-gradient-to-br from-slate-800 via-slate-600 to-orange-400" role="img" aria-label="Product photo" />
        <div className="min-w-0">
          <h1 className={`text-2xl font-bold ${pick(CLASSES.title, bug.titleNoWrap)}`} data-testid="product-title">
            Noise Cancelling Headphones NC-700 Pro Wireless Over-Ear Edition
          </h1>
          <div className="mt-1 text-sm text-slate-500">★ 4.8 · 1,284 reviews</div>
          <div className="mt-4 text-3xl font-bold" data-testid="product-price">
            {formatUah(PRICE)}
          </div>
          <button
            type="button"
            data-testid="add-to-cart"
            onClick={() => setAdded(true)}
            className={`${pick(CLASSES.cartButton, bug.cartHiddenMobile)} mt-4 items-center justify-center rounded-md bg-orange-500 px-6 py-2.5 font-semibold text-white hover:bg-orange-600`}
          >
            Add to cart
          </button>
          {added && (
            <p role="status" className="mt-2 text-sm text-emerald-700" data-testid="added">
              Added to cart ✓
            </p>
          )}
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Quiet your world with adaptive noise cancelling, all-day comfort and crystal-clear calls. Fold them flat into the hard case and take them
            anywhere.
          </p>
        </div>
      </article>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Specifications</h2>
        <div className={`mt-2 ${pick(CLASSES.tableWrap, bug.tableOverflow)}`} data-testid="specs-wrap">
          <table className={`${pick(CLASSES.table, bug.tableOverflow)} border-collapse text-sm`} data-testid="specs">
            <tbody>
              {SPECS.map(([k, v]) => (
                <tr key={k} className="border-b border-slate-200">
                  <th scope="row" className="w-48 py-2 pr-4 text-left font-medium text-slate-700">
                    {k}
                  </th>
                  <td className="py-2 text-slate-600">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PlaygroundShell>
  );
}
