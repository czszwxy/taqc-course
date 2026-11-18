const rules = () => cssRules();
const ruleFor = (part, media = null) => rules().filter((r) => r.selector.includes(part) && (media === null ? r.media === null : (r.media || '').includes(media)));
const value = (rule, property) => rule.style.getPropertyValue(property).trim();

describe('focus', () => {
  it('nothing removes the focus outline', () => {
    const removing = rules().filter((r) => /:focus(?!-visible|-within)/.test(r.selector) && !r.selector.includes(':not(:focus-visible)') && (value(r, 'outline-style') === 'none' || value(r, 'outline-width') === '0px' || value(r, 'outline') === 'none'));
    expect(removing.map((r) => r.selector), 'Правила, що прибирають рамку фокусу').toEqual([]);
  }, 'Видали .btn:focus { outline: none; }.');

  it('.btn:focus-visible draws a 3px #f59e0b outline 2px away', () => {
    const rule = must(ruleFor(':focus-visible').find((r) => r.selector.includes('.btn') && !r.selector.includes(':not(:focus-visible)')), 'Немає правила .btn:focus-visible.');
    expect([value(rule, 'outline-width'), value(rule, 'outline-style'), rgb(value(rule, 'outline-color')), value(rule, 'outline-offset')]).toEqual(['3px', 'solid', rgb('#f59e0b'), '2px']);
  }, '.btn:focus-visible { outline: 3px solid #f59e0b; outline-offset: 2px; }');
});

describe('hover and disabled', () => {
  it('.btn:hover darkens the background to #1e40af', () => {
    const rule = must(ruleFor(':hover').find((r) => r.selector.includes('.btn')), 'Немає правила .btn:hover.');
    expect(rgb(value(rule, 'background-color'))).toBe(rgb('#1e40af'));
  }, '.btn:hover { background-color: #1e40af; }');

  it('the disabled button is grey with a not-allowed cursor', () => {
    const disabled = must($('.btn:disabled'), 'Вимкнена кнопка зникла.');
    expect([color(disabled, 'background-color'), color(disabled), css(disabled, 'cursor')]).toEqual([rgb('#e5e7eb'), rgb('#4b5563'), 'not-allowed']);
    const enabled = $('button.btn:not(:disabled)');
    expect(color(enabled, 'background-color'), 'Звичайна кнопка лишається синьою.').toBe(rgb('#1d4ed8'));
  }, '.btn:disabled { background-color: #e5e7eb; color: #4b5563; cursor: not-allowed; }');
});

describe('motion', () => {
  it('.btn has a background transition of at most 300ms', () => {
    const rule = must(ruleFor('.btn').find((r) => value(r, 'transition-duration') !== '' && !r.selector.includes(':')), 'У правилі .btn немає transition.');
    const duration = value(rule, 'transition-duration');
    const ms = duration.endsWith('ms') ? parseFloat(duration) : parseFloat(duration) * 1000;
    expect(value(rule, 'transition-property').includes('background'), 'Анімувати треба background-color.').toBe(true);
    expect(ms > 0 && ms <= 300, `Тривалість ${duration} — потрібно до 300 мс.`).toBe(true);
  }, '.btn { transition: background-color 150ms ease; }');

  it('reduced motion turns the transition off', () => {
    const rule = must(ruleFor('.btn', 'prefers-reduced-motion').find((r) => (r.media || '').includes('reduce')) || ruleFor('*', 'prefers-reduced-motion').find((r) => (r.media || '').includes('reduce')), 'Немає правила для .btn у @media (prefers-reduced-motion: reduce).');
    const off = value(rule, 'transition-property') === 'none' || ['0s', '0ms'].includes(value(rule, 'transition-duration')) || value(rule, 'transition') === 'none';
    expect(off, 'У @media (prefers-reduced-motion: reduce) переходу не має бути: transition: none.').toBe(true);
  }, '@media (prefers-reduced-motion: reduce) { .btn { transition: none; } }');
});
