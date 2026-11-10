const MODULE_NUMBER_DIGITS = 2;

/** 7 → "07" — module numbers are always shown with two digits. */
export function formatModuleNumber(n: number): string {
  return String(n).padStart(MODULE_NUMBER_DIGITS, '0');
}
