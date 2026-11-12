import { test, expect, type Locator, type Page } from '@playwright/test';

interface SignupData {
  fullName: string;
  email: string;
  age: string;
  password: string;
  confirm: string;
  country: string;
}

const VALID: SignupData = {
  fullName: 'Olena Kovalenko',
  email: 'olena.k@example.com',
  age: '30',
  password: 'Secret123',
  confirm: 'Secret123',
  country: 'Ukraine',
};

class SignupPage {
  readonly page: Page;
  readonly welcome: Locator;

  constructor(page: Page) {
    this.page = page;
    this.welcome = page.getByRole('heading', { name: /^Welcome,/ });
  }

  async goto(): Promise<void> {
    await this.page.goto('/playground/signup');
  }

  /** Fills the whole form, accepts the Terms and submits. */
  async register(data: SignupData): Promise<void> {
    await this.page.getByLabel('Full name').fill(data.fullName);
    await this.page.getByLabel('Email').fill(data.email);
    await this.page.getByLabel('Age').fill(data.age);
    await this.page.getByLabel('Password', { exact: true }).fill(data.password);
    await this.page.getByLabel('Confirm password').fill(data.confirm);
    await this.page.getByLabel('Country').selectOption(data.country);
    await this.page.getByLabel('I agree to the Terms of Service').check();
    await this.page.getByRole('button', { name: 'Create account' }).click();
  }

  // твій код тут: error(field) — локатор помилки під полем
}

test('valid data creates an account', async ({ page }) => {
  const signup = new SignupPage(page);
  await signup.goto();

  await signup.register(VALID);

  await expect(signup.welcome).toHaveText('Welcome, Olena Kovalenko!');
});

// твій код тут: ім'я з пробілів, email без крапки в домені, пароль рівно 20 символів
