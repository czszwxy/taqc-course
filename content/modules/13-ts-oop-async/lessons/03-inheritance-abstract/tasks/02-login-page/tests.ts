import { BasePage, LoginPage } from './solution';

describe('LoginPage', () => {
  it('is a BasePage', () => {
    expect(new LoginPage()).toBeInstanceOf(BasePage);
  });
  it('opens /login', () => {
    const page = new LoginPage();
    page.open();
    expect(page.actions).toEqual(['goto /login']);
  }, "Виклич super('/login') у конструкторі.");
  it('overrides the title', () => {
    expect(new LoginPage().title()).toBe('Gadgetly — Login');
    expect(new BasePage('/').title()).toBe('Gadgetly');
  });
  it('records login actions', () => {
    const page = new LoginPage();
    page.open();
    page.login('qa@gadgetly.test', 'Test1234');
    expect(page.actions).toEqual(['goto /login', 'fill email: qa@gadgetly.test', 'fill password: Test1234', 'click Log in']);
  });
});
