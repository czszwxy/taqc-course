export const MIN_RETRIES = 0;
export const MAX_RETRIES = 5;

export class RunConfig {
  private _retries = 0;

  get retries(): number {
    return this._retries;
  }

  set retries(value: number) {
    if (!Number.isInteger(value) || value < MIN_RETRIES || value > MAX_RETRIES) {
      throw new RangeError('retries must be an integer from 0 to 5');
    }
    this._retries = value;
  }
}
