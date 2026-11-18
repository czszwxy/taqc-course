const byRole = (name) => $$('body *').filter((el) => role(el) === name);
const navNamed = (name) => $$('nav').find((nav) => accessibleName(nav) === name);

describe('document', () => {
  it('doctype, lang, charset, viewport, title and description', () => {
    expect(Boolean(document.doctype) && document.doctype.name === 'html', 'Немає <!doctype html>.').toBe(true);
    expect(document.documentElement.getAttribute('lang'), 'lang="uk" у <html>.').toBe('uk');
    expect((must(document.head.querySelector('meta[charset]'), 'Немає <meta charset>.').getAttribute('charset') || '').toLowerCase()).toBe('utf-8');
    const viewport = (must(document.head.querySelector('meta[name="viewport"]'), 'Немає viewport.').getAttribute('content') || '').replace(/\s+/g, '');
    expect(viewport.includes('width=device-width') && viewport.includes('initial-scale=1'), 'viewport: width=device-width, initial-scale=1.').toBe(true);
    expect(text(must(document.head.querySelector('title'), 'Немає <title>.'))).toBe('Gadgetly Watch 3 — Gadgetly');
    expect((must(document.head.querySelector('meta[name="description"]'), 'Немає meta description.').getAttribute('content') || '').trim().length, 'Опис закороткий.').toBeGreaterThanOrEqual(20);
  }, 'Скелет документа — урок 1.');
});

describe('header', () => {
  it('the first link skips to #main', () => {
    const first = must($('a'), 'Немає посилань.');
    expect([accessibleName(first), first.getAttribute('href')]).toEqual(['Перейти до основного вмісту', '#main']);
    expect(must(document.getElementById('main'), 'Немає id="main".').localName).toBe('main');
  }, 'Skip link першим, <main id="main">.');

  it('the header has the logo link and the main menu', () => {
    const banners = byRole('banner');
    expect(banners.length, 'Потрібен один <header> поза <main>.').toBe(1);
    const logo = must(banners[0].querySelector('a[href="/"]'), 'У шапці немає логотипа-посилання на /.');
    const img = must(logo.querySelector('img[src="logo.svg"]'), 'У посиланні немає logo.svg.');
    expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual(['120', '32']);
    expect(/gadgetly/i.test(accessibleName(logo)), 'Назва логотипа-посилання має містити «Gadgetly».').toBe(true);
    const menu = must(navNamed('Головне меню'), 'Немає <nav aria-label="Головне меню">.');
    expect(Boolean(menu.closest('header')), 'Головне меню — у шапці.').toBe(true);
    expect(Array.from(menu.querySelectorAll('ul > li > a')).map((a) => text(a))).toEqual(['Каталог', 'Доставка', 'Контакти']);
    expect(Array.from(menu.querySelectorAll('[aria-current="page"]')).map((a) => text(a))).toEqual(['Каталог']);
  }, 'Шапка — уроки 3, 6 і 8.');
});

describe('main', () => {
  it('the breadcrumbs are a named nav with an ordered list', () => {
    const crumbs = must(navNamed('Хлібні крихти'), 'Немає <nav aria-label="Хлібні крихти">.');
    const links = Array.from(crumbs.querySelectorAll('ol > li > a'));
    expect(links.map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['Головна', '/'],
      ['Годинники', '/catalog/watches'],
      ['Gadgetly Watch 3', '/product/watch-3'],
    ]);
    expect(Array.from(crumbs.querySelectorAll('[aria-current="page"]')).map((a) => text(a))).toEqual(['Gadgetly Watch 3']);
  }, 'Хлібні крихти — урок 8.');

  it('the product is an <article> with the only <h1>', () => {
    expect($$('h1').length, 'На сторінці має бути один <h1>.').toBe(1);
    const h1 = $('h1');
    expect(text(h1)).toBe('Розумний годинник Gadgetly Watch 3');
    expect(Boolean(h1.closest('main article')), '<h1> — усередині <article> товару в <main>.').toBe(true);
  }, 'Товар — урок 6.');

  it('the photo is a <figure> with alt, size and caption', () => {
    const figure = must($('article figure'), 'Фото має бути в <figure> усередині статті.');
    const img = must(figure.querySelector('img[src="watch-3.jpg"]'), 'У <figure> немає watch-3.jpg.');
    const alt = (img.getAttribute('alt') || '').trim();
    expect(alt.length >= 10 && /годинник/i.test(alt), 'alt має описати годинник.').toBe(true);
    expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual(['600', '600']);
    expect(text(must(figure.querySelector('figcaption'), 'Немає <figcaption>.'))).toBe('Корпус 44 мм, ремінець можна замінити');
  }, 'Зображення — урок 3.');

  it('the price is <strong> and the old price is <del>', () => {
    expect(text(must($('article strong'), 'Ціни в <strong> немає.'))).toBe('7 999 грн');
    expect(text(must($('article del'), 'Старої ціни в <del> немає.'))).toBe('9 499 грн');
  }, 'Ціна — урок 2.');

  it('the add-to-cart form posts the quantity to /cart', () => {
    const form = must($('form[action="/cart"]'), 'Немає форми з action="/cart".');
    expect((form.getAttribute('method') || '').toLowerCase()).toBe('post');
    const qty = must(form.querySelector('input[name="quantity"]'), 'Немає поля name="quantity".');
    expect([accessibleName(qty), qty.type, qty.min, qty.max, qty.value]).toEqual(['Кількість', 'number', '1', '5', '1']);
    expect(qty.labels.length, 'Поле «Кількість» підписане через <label>.').toBeGreaterThan(0);
    const button = must(form.querySelector('button'), 'У формі немає кнопки.');
    expect([text(button), button.type]).toEqual(['Додати в кошик', 'submit']);
  }, 'Форма — урок 5.');

  it('«Характеристики» is a section with a table of row headers', () => {
    const section = must($$('section').find((s) => text(s.querySelector('h2')) === 'Характеристики'), 'Немає <section> з <h2>Характеристики</h2>.');
    const table = must(section.querySelector('table'), 'У розділі немає <table>.');
    expect(text(must(table.caption, 'Немає <caption>.')).includes('Характеристики'), 'caption має назвати таблицю.').toBe(true);
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    expect(rows.map((tr) => text(tr.cells[0]))).toEqual(['Екран', 'Автономність', 'Захист', 'Датчики']);
    expect(rows.every((tr) => tr.cells[0].localName === 'th' && tr.cells[0].getAttribute('scope') === 'row'), 'Назви — <th scope="row">.').toBe(true);
  }, 'Таблиця — урок 4.');

  it('the reviews section has id="reviews" and each review is an <article> with <h3>', () => {
    const section = must(document.getElementById('reviews'), 'Немає id="reviews".');
    expect(text(must(section.querySelector('h2'), 'У відгуків немає <h2>.'))).toBe('Відгуки');
    const reviews = Array.from(section.querySelectorAll('article'));
    expect(reviews.map((a) => text(a.querySelector('h3')))).toEqual(['Андрій', 'Ірина']);
  }, 'Відгуки — уроки 2 і 6.');

  it('«Схожі товари» is an <aside> with a list of links', () => {
    const aside = must($('aside'), 'Немає <aside>.');
    expect(text(aside.querySelector('h2'))).toBe('Схожі товари');
    expect(Array.from(aside.querySelectorAll('ul > li > a')).map((a) => a.getAttribute('href'))).toEqual(['/product/watch-3-pro', '/product/band-2']);
  }, 'Побічний вміст — урок 6.');
});

describe('footer', () => {
  it('the footer has an <address> with mailto: and tel: links', () => {
    const footers = byRole('contentinfo');
    expect(footers.length, 'Потрібен один <footer> сайту.').toBe(1);
    const address = must(footers[0].querySelector('address'), 'У футері немає <address>.');
    expect(Boolean(address.querySelector('a[href="mailto:help@gadgetly.example"]')), 'Email — посилання mailto:.').toBe(true);
    expect(Boolean(address.querySelector('a[href="tel:+380441234567"]')), 'Телефон — посилання tel:+380441234567.').toBe(true);
    expect(text(footers[0]).includes('© 2026 Gadgetly')).toBe(true);
  }, 'Футер — уроки 3 і 6.');
});

describe('whole page', () => {
  it('headings do not skip levels', () => {
    const levels = headings().map((h) => h.level);
    expect(levels.filter((level, i) => i > 0 && level > levels[i - 1] + 1), 'Заголовки, що перестрибують рівень').toEqual([]);
  }, 'h1 → h2 → h3, без стрибків.');

  it('every image has alt and every link, field and button has a name', () => {
    expect($$('img').filter((img) => !img.hasAttribute('alt')).map((img) => img.getAttribute('src')), 'Зображення без alt').toEqual([]);
    expect($$('a, button').filter((el) => accessibleName(el) === '').map((el) => el.outerHTML.slice(0, 60)), 'Без назви').toEqual([]);
    expect($$('input, select, textarea').filter((el) => accessibleName(el) === '').map((el) => el.name), 'Поля без назви').toEqual([]);
  }, 'Доступні назви — урок 7.');

  it('ids are unique and no tabindex is positive', () => {
    const ids = $$('[id]').map((el) => el.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i), 'Повторені id').toEqual([]);
    expect($$('[tabindex]').filter((el) => Number(el.getAttribute('tabindex')) > 0).length).toBe(0);
  }, 'Унікальні id — урок 1, tabindex — урок 7.');
});
