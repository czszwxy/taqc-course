const navNamed = (name) => $$('nav').find((nav) => accessibleName(nav) === name);

describe('navigation', () => {
  it('the two <nav>s are named «Головне меню» and «Хлібні крихти»', () => {
    const names = $$('nav').map((nav) => accessibleName(nav));
    expect(names.slice().sort()).toEqual(['Головне меню', 'Хлібні крихти']);
  }, 'aria-label="Головне меню" і aria-label="Хлібні крихти" — дві області з різними назвами.');

  it('«Каталог» is the current page in the main menu', () => {
    const menu = must(navNamed('Головне меню'), 'Немає <nav aria-label="Головне меню">.');
    const current = Array.from(menu.querySelectorAll('[aria-current="page"]')).map((el) => text(el));
    expect(current).toEqual(['Каталог']);
  }, 'Лише в пункту «Каталог»: aria-current="page".');
});

describe('disclosure', () => {
  it('«Категорії» is a collapsed button that controls #categories', () => {
    const button = must($$('button').find((b) => accessibleName(b).startsWith('Категорії')), 'Немає <button> «Категорії».');
    expect(accessibleName(button), 'Стрілку ▾ прибери з тексту кнопки.').toBe('Категорії');
    expect([button.type, button.getAttribute('aria-expanded'), button.getAttribute('aria-controls')]).toEqual(['button', 'false', 'categories']);
    expect($$('.dropdown').some((el) => el.localName === 'div'), '<div class="dropdown"> досі на сторінці.').toBe(false);
  }, '<button type="button" aria-expanded="false" aria-controls="categories">Категорії</button>.');

  it('the list #categories is hidden with the hidden attribute', () => {
    const list = must(document.getElementById('categories'), 'Немає списку id="categories".');
    expect([list.localName, list.hasAttribute('hidden'), isHidden(list)]).toEqual(['ul', true, true]);
  }, 'Атрибут hidden ховає список для всіх; скрипт потім прибиратиме його.');
});

describe('icon button', () => {
  it('the search button is named «Пошук» and its icon is hidden', () => {
    const button = must($$('button').find((b) => b.querySelector('svg')), 'Кнопка з іконкою пошуку зникла.');
    expect(accessibleName(button)).toBe('Пошук');
    expect(button.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
  }, 'aria-label="Пошук" на кнопці, aria-hidden="true" на <svg>.');
});

describe('breadcrumbs', () => {
  it('the breadcrumbs are an ordered list of three items', () => {
    const crumbs = must(navNamed('Хлібні крихти'), 'Немає <nav aria-label="Хлібні крихти">.');
    const items = Array.from(crumbs.querySelectorAll('ol > li')).map((li) => text(li));
    expect(items).toEqual(['Головна', 'Каталог', 'Навушники']);
  }, '<ol><li>…</li></ol> без символів › у тексті пунктів.');

  it('«Навушники» is marked as the current page', () => {
    const crumbs = must(navNamed('Хлібні крихти'), 'Немає <nav aria-label="Хлібні крихти">.');
    const current = Array.from(crumbs.querySelectorAll('[aria-current="page"]')).map((el) => text(el));
    expect(current).toEqual(['Навушники']);
  }, 'Остання ланка — aria-current="page".');
});
