describe('links', () => {
  it('the page has exactly three links', () => {
    expect($$('a').length, 'Посилань на сторінці більше, ніж три: якесь посилання не закрите, і браузер «тягне» його далі.').toBe(3);
  }, 'Після тексту «самовивіз» бракує закривального </a>.');

  it('the links are «Нова пошта», «Укрпошта», «самовивіз» with #nova, #ukr, #pickup', () => {
    const links = $$('a');
    expect(links.map((a) => text(a))).toEqual(['Нова пошта', 'Укрпошта', 'самовивіз']);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['#nova', '#ukr', '#pickup']);
  }, 'Текст посилання — лише слово «самовивіз», крапка вже поза посиланням: <a href="#pickup">самовивіз</a>.');
});

describe('image and paragraphs', () => {
  it('the image alt is «Вантажівка з посилками»', () => {
    const img = must($('img'), 'Зображення зникло.');
    expect(img.getAttribute('alt')).toBe('Вантажівка з посилками');
  }, 'Значення атрибута з пробілами пиши в лапках: alt="Вантажівка з посилками".');

  it('«Термін доставки: 1–3 дні» is one paragraph', () => {
    const p = must($$('p').find((el) => text(el).startsWith('Термін доставки')), 'Немає абзацу «Термін доставки».');
    expect(text(p)).toBe('Термін доставки: 1–3 дні');
    expect(p.querySelector('div'), '<div> не може стояти всередині <p>.').toBe(null);
  }, 'Абзац може містити лише текст і рядкові елементи: заміни <div> на <strong> чи <span>.');

  it('there are no empty paragraphs', () => {
    expect($$('p').filter((p) => text(p) === '').length, 'На сторінці є порожній <p> — браузер створив його, коли закрив абзац перед <div>.').toBe(0);
  }, 'Порожній абзац з\'являється, коли в <p> стоїть блоковий елемент. Прибери <div> з абзацу.');
});

describe('sections and list', () => {
  it('every id is used once', () => {
    const ids = $$('[id]').map((el) => el.id);
    const repeated = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(repeated, 'Ці id повторюються').toEqual([]);
  }, 'Розділ «Самовивіз» скопіювали разом з id="nova". У кожного елемента має бути свій id.');

  it('#nova, #ukr and #pickup lead to their sections', () => {
    expect(text(must(document.getElementById('nova'), 'Немає id="nova".'))).toBe('Нова пошта');
    expect(text(must(document.getElementById('ukr'), 'Немає id="ukr".'))).toBe('Укрпошта');
    expect(text(must(document.getElementById('pickup'), 'Немає id="pickup" — посилання «самовивіз» нікуди не веде.'))).toBe('Самовивіз');
  }, 'Дай заголовку «Самовивіз» id="pickup".');

  it('the three payment methods are one bulleted list', () => {
    const items = $$('li');
    expect(items.length).toBe(3);
    expect(items.every((li) => li.parentElement && li.parentElement.localName === 'ul'), 'Кожен <li> має лежати всередині <ul>.').toBe(true);
    expect(new Set(items.map((li) => li.parentElement)).size, 'Усі три пункти — в одному списку.').toBe(1);
  }, 'Обгорни три <li> у <ul>…</ul>.');
});
