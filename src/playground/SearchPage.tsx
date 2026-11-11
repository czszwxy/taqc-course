import { useState } from 'react';
import { PlaygroundShell, formatUah, inputClass, isFixedMode, withLabMode } from './PlaygroundShell';
import products from './data/products.json';

/**
 * Bug Playground: Gadgetly catalog search & filters with 6 INTENTIONAL bugs (catalogued in
 * content/modules/06-qa-practice-lab/lessons/06-search-filters/tasks/03-bug-hunt/task.json).
 * Open with `?fixed` for the correct implementation. Keep this file and the bug catalog in sync.
 */

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  rating: number;
  inStock: boolean;
}

type SortKey = 'relevance' | 'price-asc' | 'price-desc' | 'rating';

interface Filters {
  query: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  inStockOnly: boolean;
  sort: SortKey;
}

const ALL = 'All';
const CATALOG: Product[] = products;
const CATEGORIES = [ALL, ...Array.from(new Set(CATALOG.map((p) => p.category)))];
const EMPTY_FILTERS: Filters = { query: '', category: ALL, minPrice: '', maxPrice: '', inStockOnly: false, sort: 'relevance' };
const SORT_LABELS: Record<SortKey, string> = {
  relevance: 'Relevance',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  rating: 'Rating',
};

function getBugs(fixed: boolean) {
  const on = !fixed;
  return {
    searchCase: on, // search is case-sensitive
    maxExclusive: on, // max price is exclusive (price < max)
    sortAsText: on, // "Price: high to low" compares prices as text
    countIgnoresStock: on, // result counter ignores the "In stock only" filter
    clearKeepsSearch: on, // "Clear filters" does not clear the search box
    addOutOfStock: on, // "Add to cart" is enabled for out-of-stock products
  };
}
type Bugs = ReturnType<typeof getBugs>;

function toLimit(text: string): number | null {
  const trimmed = text.trim();
  return trimmed === '' || Number.isNaN(Number(trimmed)) ? null : Number(trimmed);
}

function matchesSearch(p: Product, query: string, bug: Bugs): boolean {
  const q = query.trim();
  if (!q) return true;
  return bug.searchCase ? p.name.includes(q) : p.name.toLowerCase().includes(q.toLowerCase());
}

function matchesPrice(p: Product, min: number | null, max: number | null, bug: Bugs): boolean {
  const aboveMin = min === null || p.price >= min;
  const belowMax = max === null || (bug.maxExclusive ? p.price < max : p.price <= max);
  return aboveMin && belowMax;
}

const SORTERS: Record<SortKey, (bug: Bugs) => (a: Product, b: Product) => number> = {
  relevance: () => () => 0,
  'price-asc': () => (a, b) => a.price - b.price,
  'price-desc': (bug) => (bug.sortAsText ? (a, b) => String(b.price).localeCompare(String(a.price)) : (a, b) => b.price - a.price),
  rating: () => (a, b) => b.rating - a.rating,
};

function search(f: Filters, bug: Bugs): { shown: Product[]; count: number; rangeError: boolean } {
  const min = toLimit(f.minPrice);
  const max = toLimit(f.maxPrice);
  const rangeError = min !== null && max !== null && min > max;
  const base = CATALOG.filter(
    (p) => matchesSearch(p, f.query, bug) && (f.category === ALL || p.category === f.category) && matchesPrice(p, min, max, bug),
  );
  const shown = rangeError ? [] : base.filter((p) => !f.inStockOnly || p.inStock).sort(SORTERS[f.sort](bug));
  const count = bug.countIgnoresStock && !rangeError ? base.length : shown.length;
  return { shown, count, rangeError };
}

export function SearchPage() {
  const fixed = isFixedMode();
  const bug = withLabMode(getBugs(fixed));
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [toast, setToast] = useState<string | null>(null);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((prev) => ({ ...prev, [key]: value }));
  const clear = () => setFilters((prev) => ({ ...EMPTY_FILTERS, query: bug.clearKeepsSearch ? prev.query : '' }));
  const reset = () => {
    setFilters(EMPTY_FILTERS);
    setToast(null);
  };

  const { shown, count, rangeError } = search(filters, bug);

  const requirements = (
    <>
      <li>
        <b>Search</b> by product name: partial match, <b>case-insensitive</b>, spaces before/after are ignored. Empty search = all products.
      </li>
      <li>
        <b>Category</b>, <b>price range</b> and <b>In stock only</b> combine with AND (a product must satisfy all of them).
      </li>
      <li>
        Price range is <b>inclusive</b>: Min 1,000 and Max 3,000 include products that cost exactly 1,000 or 3,000. An empty field = no limit.
      </li>
      <li>Min greater than Max → “Min price can't be greater than Max price”, no products shown.</li>
      <li>
        <b>Sort</b>: Relevance (default catalog order), Price low → high, Price high → low, Rating (best first).
      </li>
      <li>
        The counter “<b>N products found</b>” always equals the number of product cards shown. 0 results → “No products match your filters”.
      </li>
      <li>
        <b>Clear filters</b> resets everything: search text, category, prices, In stock only and sort.
      </li>
      <li>
        Out-of-stock products show an “Out of stock” label, and their <b>Add to cart</b> button is disabled.
      </li>
    </>
  );

  return (
    <PlaygroundShell brand="gadgetly" fixed={fixed} requirements={requirements} onReset={reset}>
      <h1 className="text-2xl font-bold">Catalog</h1>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="filters">
        <div className="sm:col-span-2 xl:col-span-3">
          <label htmlFor="search" className="mb-1 block text-sm font-medium text-slate-700">
            Search
          </label>
          <input id="search" type="search" data-testid="search-input" placeholder="Search products…" className={inputClass(false)} value={filters.query} onChange={(e) => set('query', e.target.value)} />
        </div>
        <div>
          <label htmlFor="category" className="mb-1 block text-sm font-medium text-slate-700">
            Category
          </label>
          <select id="category" data-testid="category" className={inputClass(false)} value={filters.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label htmlFor="min-price" className="mb-1 block text-sm font-medium text-slate-700">
              Min price
            </label>
            <input id="min-price" type="number" data-testid="min-price" className={inputClass(rangeError)} value={filters.minPrice} onChange={(e) => set('minPrice', e.target.value)} />
          </div>
          <div className="flex-1">
            <label htmlFor="max-price" className="mb-1 block text-sm font-medium text-slate-700">
              Max price
            </label>
            <input id="max-price" type="number" data-testid="max-price" className={inputClass(rangeError)} value={filters.maxPrice} onChange={(e) => set('maxPrice', e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="sort" className="mb-1 block text-sm font-medium text-slate-700">
            Sort by
          </label>
          <select id="sort" data-testid="sort" className={inputClass(false)} value={filters.sort} onChange={(e) => set('sort', e.target.value as SortKey)}>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2 xl:col-span-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" data-testid="in-stock-only" className="h-4 w-4 accent-orange-500" checked={filters.inStockOnly} onChange={(e) => set('inStockOnly', e.target.checked)} />
            In stock only
          </label>
          <button type="button" data-testid="clear-filters" onClick={clear} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            Clear filters
          </button>
        </div>
      </div>

      {rangeError && (
        <p role="alert" data-testid="range-error" className="mt-4 text-sm text-red-600">
          Min price can't be greater than Max price
        </p>
      )}

      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-600" data-testid="result-count">
          {count} {count === 1 ? 'product' : 'products'} found
        </p>
        {toast && (
          <p role="status" data-testid="cart-toast" className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-800">
            {toast}
          </p>
        )}
      </div>

      {shown.length === 0 ? (
        <p data-testid="no-results" className="mt-3 rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
          No products match your filters
        </p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="results">
          {shown.map((p) => (
            <li key={p.id} data-testid={`product-${p.id}`} className="flex flex-col rounded-lg border border-slate-200 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">{p.category}</div>
              <div className="mt-1 font-semibold" data-testid="product-name">
                {p.name}
              </div>
              <div className="mt-1 text-sm text-slate-500">★ {p.rating.toFixed(1)}</div>
              <div className="mt-2 text-lg font-bold" data-testid="product-price">
                {formatUah(p.price)}
              </div>
              {!p.inStock && <div className="mt-1 text-xs font-semibold text-red-600">Out of stock</div>}
              <button
                type="button"
                data-testid="add-to-cart"
                disabled={!p.inStock && !bug.addOutOfStock}
                onClick={() => setToast(`Added to cart: ${p.name}`)}
                className="mt-3 rounded-md bg-orange-500 py-1.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Add to cart
              </button>
            </li>
          ))}
        </ul>
      )}
    </PlaygroundShell>
  );
}
