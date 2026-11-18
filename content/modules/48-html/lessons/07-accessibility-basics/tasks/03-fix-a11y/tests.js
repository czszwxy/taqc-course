describe('page', () => {
  it('1. the page language is uk', () => {
    expect(document.documentElement.getAttribute('lang')).toBe('uk');
  }, '<html lang="uk">.');

  it('2. «Написати нам» is an h2 right after the h1', () => {
    expect(headings()).toEqual([
      { level: 1, text: 'Центр допомоги' },
      { level: 2, text: 'Написати нам' },
    ]);
  }, 'Після <h1> іде <h2>: рівні не перестрибують.');
});

describe('form', () => {
  it('3. both fields have a visible <label>', () => {
    const order = must($('[name="order"]'), 'Поле «Номер замовлення» зникло.');
    const message = must($('[name="message"]'), 'Поле «Опишіть проблему» зникло.');
    expect(order.labels.length > 0 && accessibleName(order) === 'Номер замовлення', 'Поле номера замовлення без <label> «Номер замовлення».').toBe(true);
    expect(message.labels.length > 0 && accessibleName(message) === 'Опишіть проблему', 'Поле опису без <label> «Опишіть проблему».').toBe(true);
  }, '<label for="order">Номер замовлення</label> + id="order" у поля. Placeholder — не підпис.');

  it('4. «Надіслати» is a button that submits the form', () => {
    const button = must($$('button').find((b) => accessibleName(b) === 'Надіслати'), 'Немає <button> «Надіслати».');
    expect([role(button), button.type, button.form === $('form')]).toEqual(['button', 'submit', true]);
    expect($$('div').some((d) => text(d) === 'Надіслати'), '<div> «Надіслати» досі на сторінці.').toBe(false);
  }, '<button type="submit">Надіслати</button> усередині <form>.');
});

describe('links', () => {
  it('5. no link is called «тут»', () => {
    const faq = must($('a[href="/faq"]'), 'Посилання на /faq зникло.');
    expect(accessibleName(faq)).toBe('Відповіді на часті питання');
  }, 'Текст посилання — «Відповіді на часті питання».');

  it('6. the phone icon link is named «Подзвонити в підтримку»', () => {
    const link = must($('a[href^="tel:"]'), 'Посилання на дзвінок зникло.');
    expect(accessibleName(link)).toBe('Подзвонити в підтримку');
  }, 'Дай зображенню в посиланні alt="Подзвонити в підтримку".');

  it('7. no element has a positive tabindex', () => {
    const positive = $$('[tabindex]').filter((el) => Number(el.getAttribute('tabindex')) > 0).map((el) => text(el));
    expect(positive, 'Елементи з додатним tabindex').toEqual([]);
  }, 'Прибери tabindex="1": порядок Tab має йти за порядком у HTML.');
});
