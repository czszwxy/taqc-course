describe('head', () => {
  it('the page starts with <!doctype html>', () => {
    expect(Boolean(document.doctype) && document.doctype.name === 'html', 'Немає <!doctype html> першим рядком: справжній браузер увімкнув би режим сумісності.').toBe(true);
  }, 'Додай <!doctype html> найпершим рядком, ще до <html>.');

  it('the page language is uk', () => {
    expect(document.documentElement.getAttribute('lang')).toBe('uk');
  }, 'Текст український — отже, lang="uk", а не en.');

  it('<meta charset="utf-8"> is in <head>', () => {
    const meta = must(document.head.querySelector('meta[charset]'), 'У <head> немає <meta charset="utf-8">.');
    expect(meta.getAttribute('charset').toLowerCase()).toBe('utf-8');
  }, 'Першим рядком у <head>: <meta charset="utf-8">.');

  it('the viewport lets people zoom', () => {
    const meta = must(document.head.querySelector('meta[name="viewport"]'), 'У <head> немає viewport.');
    const content = (meta.getAttribute('content') || '').replace(/\s+/g, '').toLowerCase();
    expect(content.includes('width=device-width') && content.includes('initial-scale=1'), 'viewport: width=device-width, initial-scale=1.').toBe(true);
    expect(content.includes('user-scalable'), 'Прибери user-scalable=no.').toBe(false);
    expect(content.includes('maximum-scale'), 'Не обмежуй maximum-scale.').toBe(false);
  }, 'Прибери з content заборону масштабування: залиш width=device-width, initial-scale=1.');

  it('<title> «Контакти — Gadgetly» is in <head>', () => {
    expect(document.body.querySelector('title'), 'У <body> досі є <title>.').toBe(null);
    const title = must(document.head.querySelector('title'), 'У <head> немає <title>.');
    expect(text(title)).toBe('Контакти — Gadgetly');
  }, 'Переніс <title> у <head> і допиши назву сайту: «Контакти — Gadgetly».');
});

describe('body', () => {
  it('the text stays the same', () => {
    expect($$('h1').length).toBe(1);
    expect(text($('h1'))).toBe('Контакти');
    const paragraphs = $$('p');
    expect(paragraphs.length).toBe(2);
    expect(text(paragraphs[0]).startsWith('Служба підтримки'), 'Перший абзац — про службу підтримки.').toBe(true);
    expect(text(paragraphs[1]).startsWith('Шоурум'), 'Другий абзац — про шоурум.').toBe(true);
  }, 'Вміст <body> міняти не треба: лише заголовок <h1> «Контакти» і два абзаци.');
});
