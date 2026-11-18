const byRole = (name) => $$('body *').filter((el) => role(el) === name);

describe('skip link', () => {
  it('the first link is «Перейти до основного вмісту» to #main', () => {
    const first = must($('a'), 'На сторінці немає посилань.');
    expect(accessibleName(first)).toBe('Перейти до основного вмісту');
    expect(first.getAttribute('href')).toBe('#main');
  }, 'Skip link — найперше посилання в <body>, ще до шапки.');
});

describe('landmarks', () => {
  it('there is one header (banner) with the logo and the menu', () => {
    const banners = byRole('banner');
    expect(banners.length, 'Потрібна рівно одна шапка <header> поза <main>.').toBe(1);
    expect(Boolean(banners[0].querySelector('img[alt="Gadgetly — на головну"]')), 'Логотип має бути в шапці.').toBe(true);
    expect(Boolean(banners[0].querySelector('nav')), 'Меню <nav> має бути в шапці.').toBe(true);
  }, '<div class="header"> → <header>, і він не всередині <main>.');

  it('the menu is a <nav> with the links in a list', () => {
    const nav = must($('header nav'), 'Немає <nav> у шапці.');
    const links = Array.from(nav.querySelectorAll('ul > li > a')).map((a) => text(a));
    expect(links).toEqual(['Каталог', 'Доставка', 'Контакти']);
  }, '<nav><ul><li><a>…</a></li>…</ul></nav>.');

  it('there is one <main id="main"> with the heading', () => {
    const mains = byRole('main');
    expect(mains.length, 'Потрібен рівно один <main>.').toBe(1);
    expect(mains[0].id).toBe('main');
    expect(text(must(mains[0].querySelector('h1'), '<h1> має бути в <main>.'))).toBe('Новинки тижня');
  }, '<div class="content"> → <main id="main">.');

  it('each product card is an <article> inside <main>', () => {
    const articles = $$('main article');
    expect(articles.map((a) => text(a.querySelector('h2')))).toEqual(['Gadgetly Watch 3', 'Gadgetly Pods 2', 'Павербанк Gadgetly 20K']);
  }, '<div class="card"> → <article>: картка товару — самостійний вміст.');

  it('the sidebar is an <aside> with the links in a list', () => {
    const asides = byRole('complementary');
    expect(asides.length, 'Потрібен один <aside>.').toBe(1);
    expect(text(asides[0].querySelector('h2'))).toBe('Популярні категорії');
    expect(Array.from(asides[0].querySelectorAll('ul > li > a')).map((a) => text(a))).toEqual(['Смартфони', 'Аудіо']);
  }, '<div class="sidebar"> → <aside>, посилання — у <ul>.');

  it('the footer is a <footer> (contentinfo)', () => {
    const footers = byRole('contentinfo');
    expect(footers.length, 'Потрібен один <footer> поза <main> і <article>.').toBe(1);
    expect(text(footers[0]).includes('© 2026 Gadgetly')).toBe(true);
  }, '<div class="footer"> → <footer>.');
});

describe('cleanup', () => {
  it('no div with the old classes is left', () => {
    const left = $$('div.header, div.menu, div.content, div.card, div.sidebar, div.footer').map((d) => d.className);
    expect(left, 'Ці <div> досі на сторінці').toEqual([]);
  }, 'Класи можна залишити, але на семантичних елементах.');
});
