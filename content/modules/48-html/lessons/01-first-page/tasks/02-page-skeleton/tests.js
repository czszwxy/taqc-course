const MIN_DESCRIPTION = 20;

describe('head', () => {
  it('the first line is <!doctype html>', () => {
    // A page in an iframe (the preview) never switches to quirks mode, so the check looks at the doctype itself.
    expect(Boolean(document.doctype) && document.doctype.name === 'html', 'Немає <!doctype html> першим рядком: справжній браузер увімкнув би режим сумісності.').toBe(true);
  }, 'Doctype пишуть найпершим, ще до <html>. Якщо перед ним є будь-що інше, браузер його проігнорує.');

  it('the page language is uk', () => {
    expect(document.documentElement.getAttribute('lang'), 'Мова сторінки — атрибут lang у тегу <html>.').toBe('uk');
  }, 'Атрибут пишуть у відкривальному тегу: <html lang="uk">.');

  it('<meta charset="utf-8"> is in <head>', () => {
    const meta = must(document.head.querySelector('meta[charset]'), 'У <head> немає <meta charset="utf-8">.');
    expect(meta.getAttribute('charset').toLowerCase()).toBe('utf-8');
  }, 'Кодування — першим рядком усередині <head>: <meta charset="utf-8">.');

  it('the viewport meta tag is width=device-width, initial-scale=1', () => {
    const meta = must(document.head.querySelector('meta[name="viewport"]'), 'У <head> немає <meta name="viewport">.');
    const content = (meta.getAttribute('content') || '').replace(/\s+/g, '').toLowerCase();
    expect(content.includes('width=device-width'), 'content має містити width=device-width.').toBe(true);
    expect(content.includes('initial-scale=1'), 'content має містити initial-scale=1.').toBe(true);
    expect(content.includes('user-scalable=no') || content.includes('maximum-scale=1'), 'Не забороняй збільшення сторінки.').toBe(false);
  }, 'Скопіюй рядок viewport з теорії: <meta name="viewport" content="width=device-width, initial-scale=1">.');

  it('the tab title is «Про нас — Gadgetly»', () => {
    const title = must(document.head.querySelector('title'), 'У <head> немає <title>.');
    expect(text(title)).toBe('Про нас — Gadgetly');
  }, 'Назва вкладки — це <title> у <head>, не <h1>. Перевір тире й пробіли: «Про нас — Gadgetly».');

  it('there is a meta description with one sentence', () => {
    const meta = must(document.head.querySelector('meta[name="description"]'), 'У <head> немає <meta name="description">.');
    expect((meta.getAttribute('content') || '').trim().length, 'Опис порожній або закороткий.').toBeGreaterThanOrEqual(MIN_DESCRIPTION);
  }, 'Текст опису пишуть в атрибут content: <meta name="description" content="Gadgetly — …">.');
});

describe('body', () => {
  it('«Про Gadgetly» is the only <h1>', () => {
    const all = $$('h1');
    expect(all.length, 'На сторінці має бути рівно один <h1>.').toBe(1);
    expect(text(all[0])).toBe('Про Gadgetly');
  }, 'Головний заголовок сторінки — <h1>Про Gadgetly</h1>.');

  it('the two texts are two paragraphs', () => {
    const paragraphs = $$('body p');
    expect(paragraphs.length, 'Потрібно рівно два абзаци <p>.').toBe(2);
    expect(text(paragraphs[0]).includes('з 2019 року'), 'Перший абзац — про роботу з 2019 року.').toBe(true);
    expect(text(paragraphs[1]).includes('гарантію 12 місяців'), 'Другий абзац — про перевірку й гарантію.').toBe(true);
  }, 'Кожен шматок тексту обгорни в окремий <p>…</p>. Порожній рядок у файлі не робить новий абзац.');
});
