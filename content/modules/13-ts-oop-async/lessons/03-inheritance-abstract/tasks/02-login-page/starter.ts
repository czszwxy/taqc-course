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

// твій код тут: export class LoginPage …
