const EMAIL_ERROR = 'Введіть email у форматі name@example.com';
const PHONE_ERROR = 'Введіть номер у форматі +380XXXXXXXXX';

describe('error summary', () => {
  it('the summary has role="alert" and the heading «Перевірте форму: 2 помилки»', () => {
    const summary = must($('[role="alert"]'), 'Немає блоку з role="alert".');
    const heading = must(summary.querySelector('h2'), 'У блоці помилок немає заголовка <h2>.');
    expect(text(heading)).toBe('Перевірте форму: 2 помилки');
  }, '<div class="errors" role="alert"><h2>Перевірте форму: 2 помилки</h2>…');

  it('the summary lists links to the fields with errors', () => {
    const summary = must($('[role="alert"]'), 'Немає блоку з role="alert".');
    const links = Array.from(summary.querySelectorAll('ul > li > a'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['#email', '#phone']);
    expect(links.map((a) => text(a))).toEqual([EMAIL_ERROR, PHONE_ERROR]);
  }, 'Список <ul> з посиланнями <a href="#email">…</a> і <a href="#phone">…</a>.');
});

describe('fields', () => {
  it('Email is marked invalid and described by its error', () => {
    const email = must($('#email'), 'Поле Email зникло.');
    expect(accessibleName(email)).toBe('Email');
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(accessibleDescription(email), 'Опис поля Email має бути текстом помилки (aria-describedby).').toBe(EMAIL_ERROR);
  }, 'aria-invalid="true" і aria-describedby="email-error", де email-error — id тексту помилки.');

  it('Телефон is marked invalid and described by its error', () => {
    const phone = must($('#phone'), 'Поле Телефон зникло.');
    expect(accessibleName(phone)).toBe('Телефон');
    expect(phone.getAttribute('aria-invalid')).toBe('true');
    expect(accessibleDescription(phone), 'Опис поля Телефон має бути текстом помилки (aria-describedby).').toBe(PHONE_ERROR);
  }, 'Так само, як Email: aria-invalid і aria-describedby з id помилки.');

  it('Ім\'я is valid and described by its hint', () => {
    const name = must($('#name'), 'Поле Ім\'я зникло.');
    expect(name.getAttribute('aria-invalid') === 'true', 'Ім\'я заповнене правильно — не став aria-invalid="true".').toBe(false);
    expect(accessibleDescription(name)).toBe('Як у паспорті — для отримання на пошті');
  }, 'Підказка — теж опис: aria-describedby="name-hint".');

  it('every aria-describedby points to an existing element', () => {
    const broken = $$('[aria-describedby]').flatMap((el) => el.getAttribute('aria-describedby').split(/\s+/).filter((id) => id && !document.getElementById(id)));
    expect(broken, 'aria-describedby посилається на id, яких немає').toEqual([]);
  }, 'Перевір, що id в aria-describedby збігаються з id текстів.');
});
