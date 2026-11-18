const byRole = (name) => $$('body *').filter((el) => role(el) === name);

describe('page', () => {
  it('the site header and footer are <header> and <footer>', () => {
    expect(byRole('banner').length, 'Потрібна одна шапка сайту <header> (поза статтею).').toBe(1);
    expect(byRole('contentinfo').length, 'Потрібен один футер сайту <footer> (поза статтею).').toBe(1);
    expect($$('div.site-header, div.site-footer').length, 'Старі <div> шапки й футера досі є.').toBe(0);
  }, 'Шапка й футер сайту — <header> і <footer> поза <main>.');

  it('the editors\' email is a mailto: link inside <address> in the site footer', () => {
    const footer = must(byRole('contentinfo')[0], 'Немає футера сайту.');
    const link = must(footer.querySelector('address a[href^="mailto:"]'), 'У футері немає <address> з посиланням mailto:.');
    expect(link.getAttribute('href')).toBe('mailto:blog@gadgetly.example');
  }, '<footer><address>… <a href="mailto:blog@gadgetly.example">…</a></address></footer>.');
});

describe('article', () => {
  it('the article is an <article> inside <main>', () => {
    expect($$('main article').length, 'Стаття має бути одним <article> усередині <main>.').toBe(1);
  }, '<main><article>…</article></main>.');

  it('the article header has the <h1> and a <time datetime="2026-11-10">', () => {
    const header = must($('article > header'), 'У статті немає власного <header>.');
    expect(text(must(header.querySelector('h1'), '<h1> має бути в шапці статті.'))).toBe('Як вибрати павербанк');
    const time = must(header.querySelector('time'), 'Дата має бути елементом <time>.');
    expect([time.getAttribute('datetime'), text(time)]).toEqual(['2026-11-10', '10 листопада 2026']);
  }, '<time datetime="2026-11-10">10 листопада 2026</time> — машинна дата в атрибуті, людська — у тексті.');

  it('the three parts are <section>s with <h2>', () => {
    const sections = $$('article section');
    expect(sections.map((s) => text(s.querySelector('h2')))).toEqual(['Ємність', 'Потужність заряджання', 'Вага і розмір']);
  }, 'Кожен <div> з <h2> усередині статті → <section>.');

  it('the photo is a <figure> with alt and <figcaption>', () => {
    const figure = must($('article figure'), 'Фото з підписом має бути <figure>.');
    const img = must(figure.querySelector('img'), 'У <figure> немає <img>.');
    expect((img.getAttribute('alt') || '').trim().length, 'У фото має бути змістовний alt.').toBeGreaterThanOrEqual(10);
    expect(text(must(figure.querySelector('figcaption'), 'У <figure> немає <figcaption>.'))).toBe('Павербанк на 45 Вт заряджає ноутбук');
    expect($$('p.caption').length, 'Старий <p class="caption"> досі є.').toBe(0);
  }, '<figure><img alt="…"><figcaption>Павербанк на 45 Вт заряджає ноутбук</figcaption></figure>.');

  it('the tags are in the article\'s <footer>', () => {
    const footer = must($('article > footer'), 'У статті немає власного <footer>.');
    expect(text(footer).includes('Теги: павербанки, поради')).toBe(true);
    expect(role(footer), 'Футер статті не має ставати футером сайту.').toBe('generic');
  }, '<footer> усередині <article> — «підвал» статті.');
});

describe('related', () => {
  it('«Читайте також» is an <aside> outside the article, with a list', () => {
    const aside = must($('aside'), 'Немає <aside>.');
    expect(Boolean(aside.closest('article')), '<aside> не має бути всередині статті.').toBe(false);
    expect(text(aside.querySelector('h2'))).toBe('Читайте також');
    expect(Array.from(aside.querySelectorAll('ul > li > a')).map((a) => a.getAttribute('href'))).toEqual(['/blog/cables', '/blog/charger']);
  }, '<aside><h2>Читайте також</h2><ul><li><a …>…</a></li>…</ul></aside>.');
});
