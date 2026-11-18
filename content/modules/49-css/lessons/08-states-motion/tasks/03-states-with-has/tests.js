const options = () => $$('.option');
const radios = () => $$('.option input');
const look = (el) => [color(el, 'border-top-color'), color(el, 'background-color')];
const SELECTED = [rgb('#1d4ed8'), rgb('#eff6ff')];
const PLAIN = [rgb('#d1d5db'), rgb('transparent')];

describe('delivery options', () => {
  it('options are block cards with a 2px border, radius, padding and gap', () => {
    const option = must(options()[1], 'Картки доставки зникли.');
    expect([css(option, 'display'), css(option, 'border-top-width'), css(option, 'border-top-style'), css(option, 'border-top-left-radius'), css(option, 'padding-top'), css(option, 'margin-bottom')]).toEqual(['block', '2px', 'solid', '8px', '12px', '8px']);
  }, '.option { display: block; border: 2px solid #d1d5db; border-radius: 8px; padding: 12px; margin-bottom: 8px; }');

  it('the chosen option is highlighted, the others are plain', () => {
    expect(options().map(look)).toEqual([SELECTED, PLAIN, PLAIN]);
  }, '.option:has(input:checked) { border-color: #1d4ed8; background-color: #eff6ff; }');

  it('choosing another option moves the highlight', () => {
    radios()[2].checked = true;
    expect(options().map(look)).toEqual([PLAIN, PLAIN, SELECTED]);
  }, 'Стиль має залежати від :checked, а не бути прописаним першій картці.');
});

describe('errors', () => {
  it('the invalid field has a 2px #b91c1c border, the valid one does not', () => {
    const email = must($('#email'), 'Поле email зникло.');
    expect([css(email, 'border-top-width'), color(email, 'border-top-color')]).toEqual(['2px', rgb('#b91c1c')]);
    expect(color(must($('#phone'), 'Поле телефону зникло.'), 'border-top-color'), 'Правильне поле не має бути червоним.').toBe(rgb('#6b7280'));
  }, '[aria-invalid="true"] { border: 2px solid #b91c1c; }');

  it('fixing the field removes the red border', () => {
    const email = $('#email');
    email.setAttribute('aria-invalid', 'false');
    expect(color(email, 'border-top-color')).toBe(rgb('#6b7280'));
  }, 'Селектор — саме [aria-invalid="true"], а не [aria-invalid].');

  it('the error text is #b91c1c', () => {
    expect(color(must($('.error'), 'Текст помилки зник.'))).toBe(rgb('#b91c1c'));
  }, '.error { color: #b91c1c; }');
});

describe('toggle', () => {
  it('the toggle follows aria-expanded', () => {
    const toggle = must($('.toggle'), 'Кнопка зникла.');
    expect([color(toggle, 'background-color'), color(toggle)]).toEqual([rgb('#fff'), rgb('#1d4ed8')]);
    toggle.setAttribute('aria-expanded', 'true');
    expect([color(toggle, 'background-color'), color(toggle)]).toEqual([rgb('#1d4ed8'), rgb('#fff')]);
  }, '.toggle[aria-expanded="true"] { background-color: #1d4ed8; color: #fff; }');
});
