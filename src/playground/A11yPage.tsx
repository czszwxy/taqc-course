import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { PlaygroundShell, formatUah, isFixedMode, withLabMode } from './PlaygroundShell';

/**
 * Bug Playground: Gadgetly product card for accessibility testing (module 33).
 * The correct version follows the basics of WCAG: text alternatives, labels, accessible names, contrast,
 * keyboard access, announced errors and a dialog that manages focus.
 * 8 INTENTIONAL accessibility bugs below: the first four are found by an automatic axe scan, the other four
 * only by keyboard / role checks. Open with `?fixed` for the correct version.
 * Keep the flags in sync with `bugIds` in registry.ts (same order) and with the tasks.
 */

function getBugs(fixed: boolean) {
  const on = !fixed;
  return {
    imgNoAlt: on, // the product image has no alt text
    inputNoLabel: on, // "Email" is plain text next to the field, not a <label> linked to it
    iconNoName: on, // the wishlist icon button has no accessible name
    lowContrast: on, // the delivery note is light grey on white (about 1.5:1)
    divButton: on, // "Show details" is a <div> with a click handler: no role, not reachable by keyboard
    errorNotAnnounced: on, // the email error is a plain paragraph: no role="alert", not linked to the field
    focusNotMoved: on, // the dialog opens but focus stays on the button behind it
    escNoClose: on, // Esc does not close the dialog
  };
}

const PRODUCT_PRICE_UAH = 2999;
const PRODUCT = { name: 'Wireless Headphones H1', price: PRODUCT_PRICE_UAH };
const IMAGE_ALT = 'Wireless Headphones H1, black, over-ear';
const EMAIL_ERROR = 'Enter a valid email address';

const IMAGE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" fill="#e2e8f0"/>' +
  '<path d="M100 120a60 60 0 0 1 120 0" fill="none" stroke="#1e293b" stroke-width="10"/>' +
  '<rect x="86" y="112" width="28" height="48" rx="10" fill="#1e293b"/><rect x="206" y="112" width="28" height="48" rx="10" fill="#1e293b"/></svg>';
const IMAGE_SRC = `data:image/svg+xml,${encodeURIComponent(IMAGE_SVG)}`;

/** "name@host.tld": something before @, a dot after it, and text on both sides of that dot. */
function isEmail(text: string): boolean {
  const at = text.indexOf('@');
  const dot = text.lastIndexOf('.');
  return at > 0 && dot > at + 1 && dot < text.length - 1 && !text.includes(' ');
}

const BUTTON_LOOK = 'rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50';

function DetailsToggle({ open, asDiv, onToggle }: { open: boolean; asDiv: boolean; onToggle: () => void }) {
  const text = open ? 'Hide details' : 'Show details';
  if (asDiv) {
    return (
      <div className={`${BUTTON_LOOK} inline-block cursor-pointer`} onClick={onToggle}>
        {text}
      </div>
    );
  }
  return (
    <button type="button" className={BUTTON_LOOK} aria-expanded={open} aria-controls="details" onClick={onToggle}>
      {text}
    </button>
  );
}

interface DialogProps {
  email: string;
  moveFocus: boolean;
  closeOnEsc: boolean;
  onClose: () => void;
}

function SubscribedDialog({ email, moveFocus, closeOnEsc, onClose }: DialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (moveFocus) closeRef.current?.focus();
  }, [moveFocus]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && closeOnEsc) onClose();
      // One focusable element inside: Tab must not leave the dialog.
      if (e.key === 'Tab' && document.activeElement === closeRef.current) e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeOnEsc, onClose]);

  return (
    <div className="fixed inset-0 z-10 grid place-items-center bg-slate-900/60 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 id="dialog-title" className="text-lg font-semibold">
          You&apos;re subscribed!
        </h2>
        <p className="mt-2 text-sm text-slate-700">We will send deal alerts to {email}.</p>
        <button ref={closeRef} type="button" onClick={onClose} className="mt-4 rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900">
          Close
        </button>
      </div>
    </div>
  );
}

function EmailField({ value, error, labelled, announce, onChange }: { value: string; error: boolean; labelled: boolean; announce: boolean; onChange: (v: string) => void }) {
  const className = 'mt-1 w-full rounded-md border border-slate-400 px-3 py-2 text-[15px]';
  const linked = error && announce;
  const label: ReactNode = labelled ? (
    <label htmlFor="email" className="block text-sm font-medium text-slate-800">
      Email
    </label>
  ) : (
    <span className="block text-sm font-medium text-slate-800">Email</span>
  );
  return (
    <div>
      {label}
      <input
        id={labelled ? 'email' : undefined}
        type="email"
        autoComplete="email"
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={linked ? true : undefined}
        aria-describedby={linked ? 'email-error' : undefined}
      />
      {error && (
        <p id="email-error" role={announce ? 'alert' : undefined} data-testid="email-error" className="mt-1 text-sm text-red-700">
          {EMAIL_ERROR}
        </p>
      )}
    </div>
  );
}

export function A11yPage() {
  const fixed = isFixedMode();
  const bug = withLabMode(getBugs(fixed));
  const [wished, setWished] = useState(false);
  const [details, setDetails] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState(false);
  const [dialog, setDialog] = useState(false);
  const subscribeRef = useRef<HTMLButtonElement>(null);

  const subscribe = (e: FormEvent) => {
    e.preventDefault();
    const valid = isEmail(email.trim());
    setError(!valid);
    if (valid) setDialog(true);
  };

  const closeDialog = () => {
    setDialog(false);
    subscribeRef.current?.focus();
  };

  const reset = () => {
    setWished(false);
    setDetails(false);
    setEmail('');
    setError(false);
    setDialog(false);
  };

  const requirements = (
    <>
      <li>
        <b>Images</b> have a text alternative (alt) that describes them.
      </li>
      <li>
        <b>Form fields</b> have a visible label that is linked to the field. <b>Buttons</b> — icon buttons too — have an accessible name.
      </li>
      <li>
        <b>Text contrast</b> is at least 4.5:1 (WCAG AA).
      </li>
      <li>
        <b>Keyboard</b>: every control is reachable with Tab and works with Enter / Space. “Show details” is a real button that says whether the details are
        expanded.
      </li>
      <li>
        <b>Errors</b> (“{EMAIL_ERROR}”) are announced to screen readers (<code>role=&quot;alert&quot;</code>) and linked to the field.
      </li>
      <li>
        <b>Dialog</b> “You&apos;re subscribed!”: focus moves into the dialog when it opens, <b>Esc</b> closes it, and focus returns to the Subscribe button.
      </li>
    </>
  );

  return (
    <PlaygroundShell brand="gadgetly" fixed={fixed} requirements={requirements} onReset={reset}>
      <div data-testid="product-page">
        <h1 className="text-2xl font-bold">{PRODUCT.name}</h1>
        <div className="mt-4 flex flex-wrap gap-5">
          <img src={IMAGE_SRC} alt={bug.imgNoAlt ? undefined : IMAGE_ALT} width={320} height={200} className="rounded-lg" />
          <div className="min-w-[220px] flex-1">
            <p className="text-2xl font-bold">{formatUah(PRODUCT.price)}</p>
            <p data-testid="promo-text" className={`mt-1 text-sm ${bug.lowContrast ? 'text-slate-300' : 'text-slate-700'}`}>
              Free delivery for orders from 2,000 UAH
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-label={bug.iconNoName ? undefined : 'Add to wishlist'}
                aria-pressed={wished}
                onClick={() => setWished((w) => !w)}
                className={`h-10 w-10 rounded-full border text-lg ${wished ? 'border-red-700 bg-red-50 text-red-700' : 'border-slate-400 text-slate-700'}`}
              >
                <span aria-hidden="true">♥</span>
              </button>
              <DetailsToggle open={details} asDiv={bug.divButton} onToggle={() => setDetails((d) => !d)} />
            </div>
            {wished && (
              <p role="status" data-testid="wishlist-status" className="mt-2 text-sm text-slate-700">
                Saved to your wishlist
              </p>
            )}
            {details && (
              <ul id="details" data-testid="details" className="mt-3 list-disc pl-5 text-sm text-slate-700">
                <li>Bluetooth 5.3, up to 40 hours of battery</li>
                <li>Active noise cancelling</li>
                <li>Weight: 250 g</li>
              </ul>
            )}
          </div>
        </div>

        <section aria-labelledby="alerts-title" className="mt-8 border-t border-slate-200 pt-5">
          <h2 id="alerts-title" className="text-lg font-semibold">
            Get deal alerts
          </h2>
          <form onSubmit={subscribe} noValidate className="mt-3 max-w-sm space-y-3">
            <EmailField value={email} error={error} labelled={!bug.inputNoLabel} announce={!bug.errorNotAnnounced} onChange={setEmail} />
            <button ref={subscribeRef} type="submit" className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900">
              Subscribe
            </button>
          </form>
        </section>
      </div>
      {dialog && <SubscribedDialog email={email.trim()} moveFocus={!bug.focusNotMoved} closeOnEsc={!bug.escNoClose} onClose={closeDialog} />}
    </PlaygroundShell>
  );
}
