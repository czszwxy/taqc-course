import { test, expect, type Locator, type Page } from '@playwright/test';

interface SignupData {
  fullName: string;
  email: string;
  age: string;
  password: string;
  confirm: string;
  country: string;
}

type Field = keyof SignupData;

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

  /** The error message under a field, e.g. error('email'). */
  error(field: Field): Locator {
    return this.page.getByTestId(`error-${field}`);
  }
}

test.describe('Sign-up form', () => {
  let signup: SignupPage;

  test.beforeEach(async ({ page }) => {
    signup = new SignupPage(page);
    await signup.goto();
  });

  test('valid data creates an account', async () => {
    await signup.register(VALID);
    await expect(signup.welcome).toHaveText('Welcome, Olena Kovalenko!');
  });

  test('a full name of spaces only is rejected', async () => {
    await signup.register({ ...VALID, fullName: '   ' });
    await expect(signup.error('fullName')).toHaveText('Full name is required');
    await expect(signup.welcome).toBeHidden();
  });

  test('an email without a dot in the domain is rejected', async () => {
    await signup.register({ ...VALID, email: 'olena@example' });
    await expect(signup.error('email')).toHaveText('Enter a valid email address');
  });

  test('a password of exactly 20 characters is accepted', async () => {
    const password = 'Abcdefghij1234567890';
    await signup.register({ ...VALID, password, confirm: password });
    await expect(signup.welcome).toHaveText('Welcome, Olena Kovalenko!');
  });
});
