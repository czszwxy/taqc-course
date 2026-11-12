import { Link } from 'react-router-dom';

/** Static "Terms of Service" page that AccountPage opens in a new tab (practice for popups / new pages). */
export function TermsPage() {
  return (
    <div className="min-h-full bg-slate-100 p-8 text-slate-900" style={{ colorScheme: 'light' }}>
      <article className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Gadgetly Terms of Service</h1>
        <p className="mt-1 text-sm text-slate-500" data-testid="terms-updated">
          Last updated: 1 March 2026
        </p>
        <p className="mt-4">
          These demo terms belong to the Gadgetly training shop of my-university. Nothing here is a real agreement: the page exists so that you can practise
          testing links that open in a new browser tab.
        </p>
        <h2 className="mt-6 text-lg font-semibold">1. Orders</h2>
        <p className="mt-2">Orders are created for test purposes only. No goods are shipped and no money is charged.</p>
        <h2 className="mt-6 text-lg font-semibold">2. Accounts</h2>
        <p className="mt-2">You may delete your demo account at any time on the My account page.</p>
        <Link to="/playground" className="mt-8 inline-block text-sm text-orange-600 underline">
          ← Back to the Bug Playground
        </Link>
      </article>
    </div>
  );
}
