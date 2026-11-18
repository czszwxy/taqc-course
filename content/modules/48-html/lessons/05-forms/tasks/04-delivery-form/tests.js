function labelled(selector, start) {
  return must(
    $$(selector).find((el) => Array.from(el.labels || []).some((label) => text(label).startsWith(start))),
    `Немає поля з підписом <label> «${start}».`,
  );
}

describe('delivery method', () => {
  it('the radios are one group named "delivery" inside a fieldset with a legend', () => {
    const fieldset = must($('fieldset'), 'Немає <fieldset>.');
    expect(text(must(fieldset.querySelector('legend'), 'У <fieldset> немає <legend>.'))).toBe('Спосіб доставки');
    const radios = Array.from(fieldset.querySelectorAll('input[type="radio"]'));
    expect(radios.length, 'У групі мають бути три радіокнопки.').toBe(3);
    expect(radios.map((r) => r.name)).toEqual(['delivery', 'delivery', 'delivery']);
    expect(radios.map((r) => r.value)).toEqual(['nova', 'ukr', 'pickup']);
  }, 'Однаковий name="delivery" робить з трьох кнопок одну групу.');

  it('every radio has a label and «Нова пошта» is chosen by default', () => {
    const radios = $$('input[type="radio"]');
    expect(radios.map((r) => accessibleName(r))).toEqual(['Нова пошта', 'Укрпошта', 'Самовивіз']);
    expect(radios.map((r) => r.checked)).toEqual([true, false, false]);
  }, '<label><input type="radio" … checked> Нова пошта</label>.');

  it('only one method can be chosen', () => {
    const radios = $$('input[type="radio"]');
    radios.forEach((radio) => {
      radio.checked = true;
    });
    expect(radios.filter((r) => r.checked).length, 'Вибрано кілька способів одночасно — у кнопок різні name.').toBe(1);
  }, 'Радіокнопки з різними name не пов\'язані між собою.');
});

describe('city, date, comment', () => {
  it('«Місто» is a required select with an empty first option', () => {
    const select = labelled('select', 'Місто');
    expect([select.name, select.required]).toEqual(['city', true]);
    const options = Array.from(select.options);
    expect([options[0].value, text(options[0])]).toEqual(['', 'Оберіть місто']);
    expect(options.slice(1).map((o) => text(o))).toEqual(['Київ', 'Львів', 'Одеса', 'Дніпро']);
    select.selectedIndex = 0;
    expect(select.checkValidity(), 'Форма приймає «Оберіть місто» — бракує required або value="".').toBe(false);
  }, '<select id="city" name="city" required><option value="">Оберіть місто</option>…');

  it('«Бажана дата доставки» is a date field from 2026-12-01', () => {
    const input = labelled('input', 'Бажана дата доставки');
    expect([input.type, input.name, input.min]).toEqual(['date', 'date', '2026-12-01']);
  }, 'type="date" дає календар, min="2026-12-01" — найранішу дату.');

  it('«Коментар до замовлення» is a textarea up to 300 characters', () => {
    const area = labelled('textarea', 'Коментар до замовлення');
    expect([area.name, area.maxLength]).toEqual(['comment', 300]);
  }, '<label for="comment">…</label><textarea id="comment" name="comment" maxlength="300">.');
});

describe('buttons', () => {
  it('«Назад» does not submit, «Далі: оплата» does', () => {
    const back = must($$('button').find((b) => text(b) === 'Назад'), 'Немає кнопки «Назад».');
    const next = must($$('button').find((b) => text(b) === 'Далі: оплата'), 'Немає кнопки «Далі: оплата».');
    expect(back.type, 'Кнопка без type у формі відправляє форму.').toBe('button');
    expect(next.type).toBe('submit');
  }, '«Назад» — type="button", «Далі: оплата» — type="submit".');
});
