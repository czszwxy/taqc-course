export const LOCK_AFTER = 3;

export class TestAccount {
  constructor(
    public readonly email: string,
    private password: string,
    private failedLogins = 0,
  ) {}

  get locked(): boolean {
    return this.failedLogins >= LOCK_AFTER;
  }

  login(password: string): boolean {
    if (this.locked) return false;
    if (password === this.password) {
      this.failedLogins = 0;
      return true;
    }
    this.failedLogins++;
    return false;
  }
}
