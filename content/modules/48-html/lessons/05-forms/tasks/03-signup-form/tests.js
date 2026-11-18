/** The control whose <label> text starts with `start`. */
function byLabel(start) {
  return $$('input').find((input) => Array.from(input.labels || []).some((label) => text(label).startsWith(start)));
}

function field(start) {
  return must(byLabel(start), `Немає поля з підписом <label> «${start}». Placeholder — не підпис.`);
}

describe('form', () => {
  it('the form posts to /signup', () => {
    const form = must($('form'), 'Форма зникла.');
    expect(form.getAttribute('action')).toBe('/signup');
    expect((form.getAttribute('method') || '').toLowerCase()).toBe('post');
  }, '<form action="/signup" method="post">.');
});

describe('fields', () => {
  it('«Ім\'я»: label, type text, name, autocomplete, required', () => {
    const input = field("Ім'я");
    expect([input.type, input.name, input.getAttribute('autocomplete'), input.required]).toEqual(['text', 'name', 'name', true]);
  }, 'name="name" autocomplete="name" required.');

  it('«Email»: label, type email, name, autocomplete, required', () => {
    const input = field('Email');
    expect([input.type, input.name, input.getAttribute('autocomplete'), input.required]).toEqual(['email', 'email', 'email', true]);
  }, 'type="email" дає клавіатуру з @ і перевірку формату.');

  it('«Телефон (необов\'язково)»: label, type tel, name, autocomplete, not required', () => {
    const input = field('Телефон');
    expect([input.type, input.name, input.getAttribute('autocomplete')]).toEqual(['tel', 'phone', 'tel']);
    expect(input.required, 'Телефон необов\'язковий — без required.').toBe(false);
  }, 'type="tel" name="phone" autocomplete="tel", без required.');

  it('«Пароль»: label, type password, new-password, at least 8 characters, required', () => {
    const input = field('Пароль');
    expect([input.type, input.name, input.getAttribute('autocomplete'), input.minLength, input.required]).toEqual(['password', 'password', 'new-password', 8, true]);
  }, 'На реєстрації — autocomplete="new-password"; мінімум — minlength="8".');

  it('«Погоджуюся з умовами»: a required checkbox with a label', () => {
    const box = must($('input[type="checkbox"]'), 'Чекбокс зник.');
    expect(accessibleName(box).startsWith('Погоджуюся з умовами'), 'Чекбокс має бути підписаний через <label>.').toBe(true);
    expect(box.labels.length, 'Підпис чекбокса — <label>.').toBeGreaterThan(0);
    expect([box.name, box.required]).toEqual(['terms', true]);
  }, '<label><input type="checkbox" name="terms" required> Погоджуюся з умовами</label>.');
});

describe('button and validation', () => {
  it('«Зареєструватися» is a real submit button', () => {
    const button = must($$('button').find((b) => text(b) === 'Зареєструватися'), 'Немає <button> «Зареєструватися».');
    expect(button.type).toBe('submit');
    expect(button.form, 'Кнопка має бути всередині форми.').toBe($('form'));
    expect($$('div').some((d) => text(d) === 'Зареєструватися'), '<div> «Зареєструватися» досі на сторінці.').toBe(false);
  }, '<button type="submit">Зареєструватися</button> всередині <form>.');

  it('the browser blocks an empty form and accepts a filled one', () => {
    const form = $('form');
    expect(form.checkValidity(), 'Порожня форма проходить перевірку — бракує required.').toBe(false);
    field("Ім'я").value = 'Олена';
    field('Email').value = 'olena@example.com';
    field('Пароль').value = 'correct-horse-42';
    $('input[type="checkbox"]').checked = true;
    expect(form.checkValidity(), 'Заповнена форма не проходить перевірку — зайвий required?').toBe(true);
    field('Email').value = 'olena';
    expect(form.checkValidity(), 'Email «olena» пройшов перевірку — поле має бути type="email".').toBe(false);
  }, 'required на обов\'язкових полях і чекбоксі; type="email" перевіряє формат.');
});
