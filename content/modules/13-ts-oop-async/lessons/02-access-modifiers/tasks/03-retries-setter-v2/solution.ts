export class Profile {
  private _email = '';

  get email(): string {
    return this._email;
  }

  set email(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!normalized.includes('@')) throw new Error('Invalid email');
    this._email = normalized;
  }
}
