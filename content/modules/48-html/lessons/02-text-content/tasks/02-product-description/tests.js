describe('headings', () => {
  it('the outline is h1 «Навушники Gadgetly Pods 2» and three h2 sections', () => {
    expect(headings()).toEqual([
      { level: 1, text: 'Навушники Gadgetly Pods 2' },
      { level: 2, text: 'Характеристики' },
      { level: 2, text: 'У комплекті' },
      { level: 2, text: "Як під'єднати" },
    ]);
  }, 'Назва товару — <h1>, назви трьох розділів — <h2>. Текст заголовків — як у файлі.');
});

describe('intro', () => {
  it('the intro is a paragraph with the warranty in <strong>', () => {
    const p = must($('h1 + p'), 'Одразу після <h1> має йти абзац <p> з описом.');
    const strong = must(p.querySelector('strong'), 'Речення про гарантію має бути в <strong> усередині абзацу.');
    expect(text(strong)).toBe('Гарантія — 12 місяців.');
  }, 'Обгорни лише речення «Гарантія — 12 місяців.» у <strong>, а весь опис — у <p>.');
});

describe('lists', () => {
  it('the specifications are a <dl> with four name–value pairs', () => {
    const dl = must($('dl'), 'Характеристики мають бути списком <dl>.');
    const names = Array.from(dl.querySelectorAll('dt')).map((dt) => text(dt));
    expect(names).toEqual(['Час роботи', 'Bluetooth', 'Вага', 'Захист']);
    const values = Array.from(dl.querySelectorAll('dd')).map((dd) => text(dd));
    expect(values).toEqual(['до 30 годин з кейсом', '5.3', '48 г', 'IPX4']);
    const paired = Array.from(dl.querySelectorAll('dt')).every((dt) => dt.nextElementSibling && dt.nextElementSibling.localName === 'dd');
    expect(paired, 'Після кожного <dt> має йти його <dd>.').toBe(true);
  }, 'Пара: <dt>Вага</dt><dd>48 г</dd>. Двокрапку з назви прибери — зв\'язок задає сама розмітка.');

  it('the box contents are a bulleted list of four items', () => {
    const ul = must($('ul'), 'Комплект має бути маркованим списком <ul>.');
    expect(Array.from(ul.children).map((li) => text(li))).toEqual(['Навушники', 'Зарядний кейс', 'Кабель USB-C', 'Три пари амбушур']);
  }, 'Кожен предмет — окремий <li> без дефіса на початку.');

  it('the connection steps are a numbered list of three items', () => {
    const ol = must($('ol'), 'Кроки мають бути нумерованим списком <ol>.');
    const steps = Array.from(ol.children).map((li) => text(li));
    expect(steps.length).toBe(3);
    expect(steps.some((s) => /^\d/.test(s)), 'Номери кроків ставить браузер: прибери «1.», «2.», «3.» з тексту.').toBe(false);
    expect(steps[0]).toBe('Відкрий кейс поруч із телефоном.');
  }, 'Кроки, де важливий порядок, — <ol>. Номери з тексту прибери.');

  it('every list item and term is inside its list', () => {
    expect($$('li').every((li) => ['ul', 'ol'].includes(li.parentElement.localName)), '<li> лише всередині <ul> чи <ol>.').toBe(true);
    expect($$('dt, dd').every((el) => el.parentElement.localName === 'dl'), '<dt> і <dd> лише всередині <dl>.').toBe(true);
  }, 'Не залишай пунктів поза списком.');
});
