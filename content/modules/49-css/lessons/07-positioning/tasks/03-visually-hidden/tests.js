const skip = () => must($('.skip-link'), 'Посилання .skip-link зникло.');
const onScreen = (el) => {
  const b = box(el);
  return b.width > 1 && b.height > 1 && b.bottom > 0 && b.right > 0 && b.top < window.innerHeight && b.left < window.innerWidth;
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('visually hidden', () => {
  it('hidden texts are 1×1px but stay in the accessibility tree', () => {
    const hidden = $$('.visually-hidden');
    expect(hidden.length).toBe(3);
    hidden.forEach((el) => {
      expect(isHidden(el), `«${text(el)}» прибрано з дерева доступності — display: none і visibility: hidden не підходять.`).toBe(false);
      expect(box(el).width <= 1 && box(el).height <= 1, `«${text(el)}» досі видно на екрані.`).toBe(true);
    });
  }, '.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; … }');

  it('the heart buttons keep their names', () => {
    expect($$('.icon-button').map((button) => accessibleName(button))).toEqual(['Додати Gadgetly Pods 2 в обране', 'Додати Gadgetly Pods Lite в обране']);
  }, 'Назва кнопки береться з прихованого тексту — він має лишитися в дереві доступності.');

  it('the search field keeps its label', () => {
    expect(accessibleName(must($('#q'), 'Поле пошуку зникло.'))).toBe('Пошук товарів');
  }, 'Підпис поля — label з класом .visually-hidden.');

  it('the hidden text does not stretch the buttons', () => {
    const widths = $$('.icon-button').map((button) => Math.round(box(button).width));
    expect(widths.every((w) => w <= 48), `Ширина кнопок-сердечок: ${widths.join(', ')}px — прихований текст розпирає їх.`).toBe(true);
  }, 'position: absolute виймає прихований текст з потоку.');
});

describe('skip link', () => {
  it('the skip link is off-screen but focusable', () => {
    expect(isHidden(skip()), 'display: none чи visibility: hidden роблять посилання недоступним для Tab.').toBe(false);
    expect(onScreen(skip()), 'Skip link видно ще до фокусу — сховай його за краєм екрана.').toBe(false);
  }, '.skip-link { position: absolute; transform: translateY(-200%); }');

  it('the skip link appears on focus', async () => {
    const release = simulateFocus(skip());
    await wait(400);
    try {
      expect(onScreen(skip()), 'Після фокусу skip link має з\'явитися у видимій частині сторінки.').toBe(true);
    } finally {
      release();
    }
  }, '.skip-link:focus { transform: none; }');
});
