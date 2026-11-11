export class BasePage {
  actions: string[] = [];

  constructor(protected readonly url: string) {}

  open(): void {
    this.actions.push(`goto ${this.url}`);
  }

  title(): string {
    return 'Gadgetly';
  }
}

export class LoginPage extends BasePage {
  constructor() {
    super('/login');
  }

  override title(): string {
    return `${super.title()} — Login`;
  }

  login(email: string, password: string): void {
    this.actions.push(`fill email: ${email}`, `fill password: ${password}`, 'click Log in');
  }
}
